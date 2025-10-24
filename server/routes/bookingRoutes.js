import express from "express";
import {
  createBooking,
  getBookings,
  getBusBookings,
  getByBusAndDate,
  getPassengerBookingHistory,
  getHistory,
  cancelBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/:busId/:travelDate", getBusBookings);
router.get("/by-bus-and-date", getByBusAndDate);
router.get("/passenger-history", getPassengerBookingHistory);
router.get("/history", getHistory);

// POST /api/bookings/:id/cancel { reason }
router.post("/:id/cancel", cancelBooking);

export default router;
