import Booking from "../models/Booking.js";
import Bus from "../models/Bus.js";
import Passenger from "../models/Passenger.js";
// import mongoose from "mongoose";
// minimal model shown below (if needed)

export const createBooking = async (req, res) => {
  try {
    const {
      email,
      busId,
      travelDate,
      seats,
      passenger,
      pickup,
      drop,
      payment,
    } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is missing" });
    }

    if (!busId || !travelDate || !seats?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Ensure bus exists
    const bus = await Bus.findById(busId);
    if (!bus)
      return res.status(404).json({ success: false, message: "Bus not found" });

    // Prevent double booking (seat already taken)
    const existing = await Booking.findOne({
      bus: busId,
      travelDate,
      seats: { $in: seats },
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "One or more seats already booked" });
    }

    const booking = await Booking.create({
      email: email,
      busId,
      travelDate,
      seats,
      passenger,
      pickup,
      drop,
      payment,
    });

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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

export const getBookingListByBusAndDate = async (req, res) => {
  try {
    const { busId, travelDate } = req.params;

    const bookings = await Booking.find({ busId, travelDate }).lean();
    console.log(bookings);

    res.json({
      success: true,
      data: { bookings },
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
