import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    travelDate: {
      type: String,
      required: true,
    },
    seats: {
      type: [Number],
      required: true,
    },
    passenger: {
      fname: { type: String, required: true },
      lname: { type: String, required: true },
      phone: {
        type: String,
        required: true,
        match: [/^\+94\d{9}$/, "Invalid Sri Lankan phone number"],
      },
      gender: { type: String, enum: ["Male", "Female"], required: true },
    },
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    payment: { type: String, enum: ["Cash", "Card"], required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed"],
      default: "Confirmed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", BookingSchema);
