import express from "express";
import { createBooking, getBookings, getBusBookings } from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/:busId/:travelDate", getBusBookings);

export default router;
