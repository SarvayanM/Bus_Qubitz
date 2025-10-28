import Booking from "../models/Booking.js";
import Bus from "../models/Bus.js";
import Passenger from "../models/Passenger.js";
import CancelBooking from "../models/CancelBooking.js";
// import { toDepartureDate, refundPercent } from "../utils/cancelHelpers.js";
import { toDepartureDate, refundPercent, parseMoneyToNumber, safeSeatsCount } from "../utils/serverTime.js";
import mongoose from "mongoose";

// minimal model shown below (if needed)

/**
 * GET /api/bookings/by-bus-and-date?busId=&date=YYYY-MM-DD
 * Returns bookedByGents, bookedByLadies, unavailableSeats
 */
export const getByBusAndDate = async (req, res, next) => {
  try {
    const { busId, date } = req.query;
    if (!busId || !date) {
      return res.status(400).json({ message: "busId and date are required" });
    }

    const [bus, bookings] = await Promise.all([
      Bus.findById(busId, { unavailable: 1 }),
      Booking.find({ busId, travelDate: date }, { seats: 1, gender: 1 }),
    ]);

    if (!bus) return res.status(404).json({ message: "Bus not found" });

    const bookedByGents = [];
    const bookedByLadies = [];
    // Bookings store gender per-seat (seats: [{ number, gender }]).
    // Distribute seats into gender buckets based on each seat's gender.
    bookings.forEach((b) => {
      (b.seats || []).forEach((s) => {
        const g = (s?.gender || "").toString();
        if (g === "Male") bookedByGents.push(s);
        else if (g === "Female") bookedByLadies.push(s);
        else {
          // treat unknown as ladies to preserve previous behavior? push to ladies by default
          bookedByLadies.push(s);
        }
      });
    });

    res.json({
      bookedByGents,
      bookedByLadies,
      unavailableSeats: bus.unavailable || [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings
 * Body: { email?, busId, travelDate, seats:number[], passenger:{fname,lname,phone,gender}, pickup, drop, payment }
 * Performs conflict check and creates booking.
 */
// controllers/bookingController.js

const VALID_GENDERS = ["Male", "Female", "Other"];

export async function createBooking(req, res) {
  try {
    const b = req.body || {};

    // Accept multiple shapes
    const busId = b?.bus?.id || b?.bus?.busId || b?.busId || b?.bus_id || null;

    const travelDate = b?.travelDate || b?.date || null;
    const seats = Array.isArray(b?.seats) ? b.seats : [];
    const passenger = b?.passenger || null;
    const pickup = b?.pickup ?? passenger?.pickup ?? "";
    const drop = b?.drop ?? passenger?.drop ?? "";
    const payment = b?.payment ?? b?.paymentMethod ?? "Card";

    // Optional metadata
    const meta = {
      from: b?.from ?? "",
      to: b?.to ?? "",
      busNo: b?.busNo ?? b?.bus?.busNo ?? "",
      busName: b?.busName ?? b?.bus?.busName ?? "",
      total: Number(b?.total ?? 0),
    };

    // Field-by-field validation with helpful messages
    if (!busId) {
      return res.status(400).json({ message: "busId is required" });
    }
    if (!travelDate) {
      return res.status(400).json({ message: "travelDate/date is required" });
    }
    if (!Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "seats array is required" });
    }
    if (!passenger || !passenger.phone) {
      return res
        .status(400)
        .json({ message: "passenger with phone is required" });
    }

    // Normalize / validate seats
    const normalizedSeats = seats.map((s, idx) => {
      const number =
        typeof s.number === "string" ? parseInt(s.number, 10) : s.number;
      if (!Number.isInteger(number)) {
        throw new Error(`Invalid seat number at index ${idx}`);
      }
      if (!VALID_GENDERS.includes(s.gender)) {
        throw new Error(
          `Invalid seat gender at index ${idx}; expected one of ${VALID_GENDERS.join(
            ", "
          )}`
        );
      }
      return { number, gender: s.gender };
    });

    // Atomic operation: ensure Passenger exists (create if missing) and create Booking
    const phone = normalizePhone(passenger.phone);

    let session = null;
    let usedTransaction = false;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      usedTransaction = true;
    } catch (sessErr) {
      // Could not start a session (e.g., standalone MongoDB). We'll fall back to non-transactional path.
      console.warn(
        "Warning: could not start mongoose session; continuing without transaction",
        sessErr?.message
      );
      session = null;
      usedTransaction = false;
    }

    try {
      let doc;
      if (usedTransaction && session) {
        const existingPassenger = await Passenger.findOne({ phone }).session(
          session
        );
        if (!existingPassenger) {
          try {
            await Passenger.create(
              [
                {
                  phone,
                  fname: passenger.fname || "",
                  lname: passenger.lname || "",
                  nic: passenger.nic || "",
                  email: passenger.email || "",
                },
              ],
              { session }
            );
          } catch (pe) {
            if (pe?.code === 11000) {
              // ignore - another request created it in parallel
            } else {
              throw pe;
            }
          }
        }

        // Before creating booking, check for seat conflicts for this bus/date
        const [busDoc, existingBookings] = await Promise.all([
          Bus.findById(busId, { unavailable: 1 }).session(session),
          Booking.find({ busId, travelDate }, { seats: 1 }).session(session),
        ]);

        const unavailableSeats = new Set(
          (busDoc?.unavailable || []).map((s) => Number(s.number ?? s))
        );
        const alreadyBooked = new Set();
        existingBookings.forEach((bk) => {
          (bk.seats || []).forEach((s) => alreadyBooked.add(Number(s.number)));
        });

        const requested = normalizedSeats.map((s) => Number(s.number));
        const conflicts = requested.filter(
          (n) => alreadyBooked.has(n) || unavailableSeats.has(n)
        );
        if (conflicts.length) {
          // Abort transaction and inform client which seat numbers conflict
          await session.abortTransaction();
          session.endSession();
          return res.status(409).json({
            message: "Requested seats are no longer available",
            conflicts,
          });
        }

        // Create booking within the same transaction
        [doc] = await Booking.create(
          [
            {
              busId,
              travelDate,
              seats: normalizedSeats,
              passenger: {
                fname: passenger.fname || "",
                lname: passenger.lname || "",
                phone,
                nic: passenger.nic || "",
                email: passenger.email || "",
              },
              pickup,
              drop,
              payment,
              ...meta,
            },
          ],
          { session }
        );

        await session.commitTransaction();
        session.endSession();
      } else {
        // Fallback: no transactions available. Attempt to create passenger (idempotent) then booking.
        try {
          // create passenger if not exists (race may still cause duplicate key but we'll catch it)
          await Passenger.findOneAndUpdate(
            { phone },
            {
              $setOnInsert: {
                phone,
                fname: passenger.fname || "",
                lname: passenger.lname || "",
                nic: passenger.nic || "",
                email: passenger.email || "",
              },
            },
            { upsert: true, new: true }
          );
        } catch (pe) {
          if (pe?.code === 11000) {
            // ignore duplicate key created concurrently
          } else {
            throw pe;
          }
        }

        // Check seat conflicts without a transaction
        const [busDoc, existingBookings] = await Promise.all([
          Bus.findById(busId, { unavailable: 1 }),
          Booking.find({ busId, travelDate }, { seats: 1 }),
        ]);
        const unavailableSeats = new Set(
          (busDoc?.unavailable || []).map((s) => Number(s.number ?? s))
        );
        const alreadyBooked = new Set();
        existingBookings.forEach((bk) => {
          (bk.seats || []).forEach((s) => alreadyBooked.add(Number(s.number)));
        });
        const requested = normalizedSeats.map((s) => Number(s.number));
        const conflicts = requested.filter(
          (n) => alreadyBooked.has(n) || unavailableSeats.has(n)
        );
        if (conflicts.length) {
          return res.status(409).json({
            message: "Requested seats are no longer available",
            conflicts,
          });
        }

        const created = await Booking.create({
          busId,
          travelDate,
          seats: normalizedSeats,
          passenger: {
            fname: passenger.fname || "",
            lname: passenger.lname || "",
            phone,
            nic: passenger.nic || "",
            email: passenger.email || "",
          },
          pickup,
          drop,
          payment,
          ...meta,
        });
        doc = created;
      }

      return res.status(201).json({
        success: true,
        message: "Booking created",
        data: { booking: doc },
      });
    } catch (txErr) {
      if (session && usedTransaction) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          console.warn("Failed to abort transaction", abortErr?.message);
        }
        session.endSession();
      }
      throw txErr;
    }
  } catch (e) {
    // Duplicate / validation clarity
    if (e?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Duplicate booking / unique index violated" });
    }
    if (e?.message?.startsWith("Invalid seat")) {
      return res.status(400).json({ message: e.message });
    }
    console.error("createBooking error:", e);
    return res.status(500).json({ message: "Failed to create booking" });
  }
}

export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("bus");
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBusBookings = async (req, res) => {
  try {
    const { busId, travelDate } = req.params;

    const bookings = await Booking.find({ busId, travelDate }).lean();
    console.log(bookings);
    // Separate seats by status
    const bookedByGents = [];
    const bookedByLadies = [];
    const unavailableSeats = [];

    // Each booking contains seats with per-seat gender. Distribute accordingly.
    bookings.forEach((b) => {
      if (b.status === "unavailable") {
        unavailableSeats.push(...(b.seats || []));
        return;
      }
      (b.seats || []).forEach((s) => {
        const g = (s?.gender || "").toString();
        if (g === "Male") bookedByGents.push(s);
        else if (g === "Female") bookedByLadies.push(s);
        else bookedByLadies.push(s);
      });
    });

    res.json({
      success: true,
      data: { bookedByGents, bookedByLadies, unavailableSeats },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load bookings" });
  }
};

// backend/src/controllers/bookingController.js

/**
 * GET /api/bookings/history
 * Returns all bookings for the authenticated user (email from JWT/cookie),
 * joined with Bus details via busId.
 *
 * Email resolution priority:
 *   1) req.user?.email (if you have auth middleware)
 *   2) req.cookies?.email (e.g., "email" cookie)
 *   3) req.query.email (for testing only — remove in prod if you want)
 */

// controllers/bookingController.js
// controllers/bookingController.js

/** Optional: keep numbers consistent like "+94XXXXXXXXX" or "07XXXXXXXX"
 * Adjust to your app's convention if needed.
 */
function normalizePhone(input = "") {
  if (input === undefined || input === null) return null;
  let s = String(input).trim();
  if (!s) return null;
  s = s.replace(/[\s-]/g, "");
  if (!s.startsWith("+")) s = "+" + s;
  if (/^\+\d{6,15}$/.test(s)) return s;
  return null;
}

export const getPassengerBookingHistory = async (req, res) => {
  try {
    const rawPhone =
      req.user?.phone || req.cookies?.phone || req.query?.phone || "";
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      return res.status(400).json({
        ok: false,
        message:
          "Passenger phone is required. Provide it via auth middleware, a 'phone' cookie, or the 'phone' query parameter.",
      });
    }

    const bookings = await Booking.aggregate([
      // Match by passenger.phone (exact string match after normalization)
      { $match: { "passenger.phone": phone } },
      { $sort: { createdAt: -1 } },

      // Normalize busId to ObjectId when stored as string
      {
        $addFields: {
          busIdObj: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $type: "$busId" }, "objectId"] },
                  then: "$busId",
                },
                {
                  case: {
                    $and: [
                      { $eq: [{ $type: "$busId" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$busId",
                          regex: /^[a-fA-F0-9]{24}$/,
                        },
                      },
                    ],
                  },
                  then: {
                    $convert: {
                      input: "$busId",
                      to: "objectId",
                      onError: null,
                      onNull: null,
                    },
                  },
                },
              ],
              default: null,
            },
          },
        },
      },

      // Join Bus
      {
        $lookup: {
          from: "buses", // collection name for Bus model
          localField: "busIdObj",
          foreignField: "_id",
          as: "bus",
        },
      },
      { $unwind: { path: "$bus", preserveNullAndEmptyArrays: true } },

      // Join Company (operator)
      {
        $lookup: {
          from: "companies", // collection name for Company model
          localField: "bus.companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },

      // Add UI-friendly aliases to `bus`
      {
        $addFields: {
          "bus.operatorName": { $ifNull: ["$company.name", "$bus.busName"] },
          "bus.plateNo": "$bus.busNo",
          "bus.from": "$bus.route.from",
          "bus.to": "$bus.route.to",
          "bus.departureTime": "$bus.schedule.departure",
        },
      },

      // Final shape — keep top-level fields the UI reads
      {
        $project: {
          busId: 1,
          travelDate: 1,
          seats: 1,
          passenger: 1, // { fname, lname, phone }
          pickup: 1,
          drop: 1,
          payment: 1, // "Cash" | "Card"
          status: 1, // "Pending" | "Confirmed"
          createdAt: 1,
          updatedAt: 1,
          bus: 1, // enriched
        },
      },
    ]);

    return res.status(200).json({
      ok: true,
      phone,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    console.error("getPassengerBookingHistory error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch booking history.",
      error: err?.message,
    });
  }
};

export async function getHistory(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: "phone is required" });

    const bookings = await Booking.aggregate([
      // Match by passenger.phone (exact string match after normalization)
      { $match: { "passenger.phone": phone } },
      { $sort: { createdAt: -1 } },

      // Normalize busId to ObjectId when stored as string
      {
        $addFields: {
          busIdObj: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $type: "$busId" }, "objectId"] },
                  then: "$busId",
                },
                {
                  case: {
                    $and: [
                      { $eq: [{ $type: "$busId" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$busId",
                          regex: /^[a-fA-F0-9]{24}$/,
                        },
                      },
                    ],
                  },
                  then: {
                    $convert: {
                      input: "$busId",
                      to: "objectId",
                      onError: null,
                      onNull: null,
                    },
                  },
                },
              ],
              default: null,
            },
          },
        },
      },

      // Join Bus
      {
        $lookup: {
          from: "buses", // collection name for Bus model
          localField: "busIdObj",
          foreignField: "_id",
          as: "bus",
        },
      },
      { $unwind: { path: "$bus", preserveNullAndEmptyArrays: true } },

      // Join Company (operator)
      {
        $lookup: {
          from: "companies", // collection name for Company model
          localField: "bus.companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },

      // Add UI-friendly aliases to `bus`
      {
        $addFields: {
          "bus.operatorName": { $ifNull: ["$company.name", "$bus.busName"] },
          "bus.plateNo": "$bus.busNo",
          "bus.from": "$bus.route.from",
          "bus.to": "$bus.route.to",
          "bus.departureTime": "$bus.schedule.departure",
        },
      },

      // Final shape — keep top-level fields the UI reads
      {
        $project: {
          busId: 1,
          travelDate: 1,
          seats: 1,
          passenger: 1, // { fname, lname, phone }
          pickup: 1,
          drop: 1,
          payment: 1, // "Cash" | "Card"
          status: 1, // "Pending" | "Confirmed"
          createdAt: 1,
          updatedAt: 1,
          bus: 1, // enriched
        },
      },
    ]);

    return res.status(200).json({
      ok: true,
      phone,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    console.error("getPassengerBookingHistory error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch booking history.",
      error: err?.message,
    });
  }
}


/**
 * Cancel a booking:
 * - Validate window by travelDate + (bus.schedule.departure || bus.departureTime || booking.departureTime)
 * - Refund % by hours left
 * - Base amount from bus.price (× seats count)
 * - Credit wallet
 * - Record CancelBooking
 * - Remove booking from DB
 */
// helpers you can keep in a util file




/** Example refund policy:
 * returns percent in 0..100, or -1 if not refundable.
 * Keep your existing implementation; shown here for clarity.
 */


export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "reason is required" });
    }

    const booking = await Booking.findById(id).populate({
      path: "busId",
      select: "price schedule departure busNo busName route",
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "Cancelled") {
      return res.status(400).json({ message: "Already cancelled" });
    }

    const passengerPhone = booking?.passenger?.phone;
    if (!passengerPhone) {
      return res.status(400).json({ message: "No passenger phone on booking" });
    }

    if (!booking.travelDate) {
      return res.status(500).json({ message: "Booking travelDate missing" });
    }

    // ---- departure time & refund percent ----
    const busDoc = booking.busId;
    const departTime =
      booking.departureTime ||
      booking.bus?.departureTime ||
      busDoc?.schedule?.departure ||
      busDoc?.departure ||
      "00:00";

    const departAt = toDepartureDate(booking.travelDate, departTime);
    const hoursBefore = (departAt.getTime() - Date.now()) / 3600000;
    const pct = refundPercent(hoursBefore);

    if (pct < 0) {
      return res
        .status(400)
        .json({ message: "Cancellation window has passed (< 4 hours)" });
    }

    // ---- determine base price confidently ----
    // Prefer a booking-level total if you have one (uncomment if available):
    // const bookingTotal = parseMoneyToNumber(booking.totalAmount);
    // if (!Number.isNaN(bookingTotal) && bookingTotal > 0) { ... }

    // Otherwise, use bus.price * seatsCount
    const rawBusPrice = busDoc?.price;
    const busPrice = parseMoneyToNumber(rawBusPrice);

    if (Number.isNaN(busPrice) || busPrice <= 0) {
      return res.status(400).json({
        message:
          "Bus price is invalid or missing; cannot compute refund for cancellation.",
        debug: { rawBusPrice },
      });
    }

    const seatsCount = safeSeatsCount(booking.seats);
    const baseAmount = busPrice * seatsCount;

    if (!isFinite(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({
        message: "Computed base amount is invalid.",
        debug: { busPrice, seatsCount, baseAmount },
      });
    }

    // ---- compute refund (percent is 0..100) ----
    const refundedAmount = Math.max(
      0,
      Math.round((baseAmount * pct) / 100)
    );

    // Extra guard against NaN
    if (!isFinite(refundedAmount)) {
      return res.status(400).json({
        message: "Refund amount calculation failed.",
        debug: { baseAmount, pct, refundedAmount },
      });
    }

    // ---- credit wallet ----
    const passenger = await Passenger.findOne({ phone: passengerPhone });
    if (!passenger) {
      return res.status(404).json({ message: "Passenger not found" });
    }

    const currentWallet = parseMoneyToNumber(passenger.walletBalance);
    const safeWallet = Number.isNaN(currentWallet) ? 0 : currentWallet;

    passenger.walletBalance = safeWallet + refundedAmount;
    await passenger.save();

    // ---- record cancellation ----
    await CancelBooking.create({
      bookingId: booking._id,
      passengerPhone,
      reason,
      refundPercent: pct,
      refundedAmount,
      meta: {
        travelDate: booking.travelDate,
        departTime,
        busId: busDoc?._id,
        busPrice,
        seatsCount,
        baseAmount,
      },
    });

    // ---- remove booking ----
    await booking.deleteOne();

    return res.json({
      refundedAmount,
      refundPercent: pct,
      walletBalance: passenger.walletBalance,
      removedBookingId: id,
      debug: {
        seatsCount,
        baseAmount,
        busPriceUsed: busPrice,
        percentApplied: pct,
      },
    });
  } catch (e) {
    console.error("cancelBooking error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

