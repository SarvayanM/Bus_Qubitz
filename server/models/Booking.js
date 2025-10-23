import mongoose from "mongoose";

const SeatSelectionSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    busId: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    travelDate: { type: String, required: true }, // YYYY-MM-DD
    seats: { type: [SeatSelectionSchema], required: true },
    passenger: {
      fname: { type: String, required: true },
      lname: { type: String, required: true },
      phone: {
        type: String,
        required: true,
      },
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
