// backend/models/CancelledBooking.js
import mongoose from "mongoose";

const PassengerSnapshotSchema = new mongoose.Schema(
  {
    fname: String,
    lname: String,
    phone: String,
    nic: String,
    email: String,
  },
  { _id: false }
);

const BusSnapshotSchema = new mongoose.Schema(
  {
    busNo: String,
    busName: String,
    price: mongoose.Schema.Types.Mixed,
    route: {
      from: String,
      to: String,
    },
    schedule: {
      departure: String,
    },
  },
  { _id: false }
);

const BookingSnapshotSchema = new mongoose.Schema(
  {
    travelDate: { type: String }, // "YYYY-MM-DD"

    seats: [{ type: mongoose.Schema.Types.Mixed }],
    pickup: String,
    drop: String,
    payment: String,
    createdAt: Date,
    status: String, // "Cancelled"
    passenger: PassengerSnapshotSchema,
    bus: BusSnapshotSchema,
  },
  { _id: false }
);

const CancelledBookingSchema = new mongoose.Schema(
  {
    passengerPhone: { type: String, required: true },
    reason: { type: String, required: true },
    refundPercent: { type: Number, required: true }, // 0..100
    refundedAmount: { type: Number, required: true, default: 0 },
    processedAt: { type: Date, default: Date.now },

    booking: { type: BookingSnapshotSchema, required: true },

    meta: {
      travelDate: String,
      departTime: String,
      busPrice: Number,
      seatsCount: Number,
      baseAmount: Number,
      busId: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true, collection: "cancelledBookings" }
);

CancelledBookingSchema.index({ passengerPhone: 1, processedAt: -1 });

export default mongoose.model("CancelledBooking", CancelledBookingSchema);
