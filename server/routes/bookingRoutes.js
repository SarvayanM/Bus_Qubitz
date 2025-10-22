import express from "express";
import {
  createBooking,
  getBookings,
  getBusBookings,
  getByBusAndDate,
  getPassengerBookingHistory,
} from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/:busId/:travelDate", getBusBookings);
router.get("/by-bus-and-date", getByBusAndDate);
router.get("/history", getPassengerBookingHistory);

export default router;
