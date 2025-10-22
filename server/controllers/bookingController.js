import Booking from "../models/Booking.js";
import Bus from "../models/Bus.js";
import Passenger from "../models/Passenger.js";
// import mongoose from "mongoose";
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
    bookings.forEach((b) => {
      (b.gender === "Male" ? bookedByGents : bookedByLadies).push(
        ...(b.seats || [])
      );
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
export async function createBooking(req, res) {
  try {
    const {
      email,
      bus: { id: busId } = {},
      date: travelDate,
      seats = [],
      passenger,
      pickup,
      drop,
      payment,
    } = req.body || {};

    if (!busId || !travelDate || !Array.isArray(seats) || seats.length === 0)
      return res.status(400).json({ message: "Missing required fields" });

    // Validate seats: must be [{ number, gender }]
    for (const s of seats) {
      if (typeof s.number !== "number")
        return res.status(400).json({ message: "Invalid seat number" });
      if (!["Male", "Female", "Other"].includes(s.gender))
        return res.status(400).json({ message: "Invalid seat gender" });
    }

    const doc = await Booking.create({
      email,
      busId,
      travelDate,
      seats,
      passenger,
      pickup,
      drop,
      payment,
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: "Failed" });
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

    bookings.forEach((b) => {
      if (b.status === "unavailable") {
        unavailableSeats.push(...b.seats);
      } else if (b.passenger?.gender === "Male") {
        bookedByGents.push(...b.seats);
      } else if (b.passenger?.gender === "Female") {
        bookedByLadies.push(...b.seats);
      }
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
export const getPassengerBookingHistory = async (req, res) => {
  try {
    const rawEmail =
      req.user?.email || req.cookies?.email || req.query?.email || "";
    const email = String(rawEmail).trim().toLowerCase();
    if (!email) {
      return res.status(400).json({
        ok: false,
        message:
          "User email is required. Provide it via auth middleware or 'email' cookie.",
      });
    }

    const bookings = await Booking.aggregate([
      // Match by email (case-insensitive)
      { $match: { $expr: { $eq: [{ $toLower: "$email" }, email] } } },
      { $sort: { createdAt: -1 } },

      // Normalize busId
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
          from: "buses", // ensure your Bus model maps to this collection
          localField: "busIdObj",
          foreignField: "_id",
          as: "bus",
        },
      },
      { $unwind: { path: "$bus", preserveNullAndEmptyArrays: true } },

      // Join Company (to show operator; optional but recommended)
      {
        $lookup: {
          from: "companies", // <-- adjust if your collection is named differently
          localField: "bus.companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },

      // Add aliases the UI expects on bus object
      {
        $addFields: {
          "bus.operatorName": { $ifNull: ["$company.name", "$bus.busName"] },
          "bus.plateNo": "$bus.busNo",
          "bus.from": "$bus.route.from",
          "bus.to": "$bus.route.to",
          "bus.departureTime": "$bus.schedule.departure",
        },
      },

      // Final shape (KEEP top-level payment/status/pickup/drop)
      {
        $project: {
          email: 1,
          busId: 1,
          travelDate: 1,
          seats: 1,
          passenger: 1, // { fname, lname, phone, gender }
          pickup: 1,
          drop: 1,
          payment: 1, // top-level
          status: 1, // top-level
          createdAt: 1,
          updatedAt: 1,
          bus: 1, // enriched bus with { from, to, operatorName, plateNo, departureTime, ... }
        },
      },
    ]);

    return res.status(200).json({
      ok: true,
      email,
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
