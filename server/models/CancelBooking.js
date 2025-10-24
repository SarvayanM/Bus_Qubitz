// backend/models/CancelBooking.js
import mongoose from "mongoose";

const CancelBookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    passengerPhone: { type: String, required: true },
    reason: { type: String, required: true },
    refundPercent: { type: Number, required: true }, // 0, 50, 75, 100
    refundedAmount: { type: Number, required: true, default: 0 },
    processedAt: { type: Date, default: Date.now },
    meta: { type: Object }, // optional storage (rates at cancel time, operator policy, etc.)
  },
  { timestamps: true, collection: "cancelBookings" }
);

export default mongoose.model("CancelBooking", CancelBookingSchema);
