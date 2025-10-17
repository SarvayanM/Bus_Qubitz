import express from "express";
import {
  createBooking,
  getBookings,
  getBusBookings,
  getBookingListByBusAndDate,
  getPassengerBookingHistory,
} from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/:busId/:travelDate", getBusBookings);
router.get("/list/:busId/:travelDate", getBookingListByBusAndDate);
router.get("/history", getPassengerBookingHistory);

export default router;
