// backend/routes/cancelRoutes.js
import express from "express";
import {
  cancelBooking,
  listCancelledByPhone,
} from "../controllers/cancelController.js";

const router = express.Router();

router.post("/bookings/:id/cancel", cancelBooking);
router.get("/cancelled-bookings", listCancelledByPhone);

export default router;
