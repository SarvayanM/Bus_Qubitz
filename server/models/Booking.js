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
      // contactNo is the traveller's phone number (may differ from account phone)
      contactNo: {
        type: String,
        required: true,
      },
      // account phone (optional, kept for backward compatibility)
      phone: {
        type: String,
      },
      nic: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    payment: { type: String, enum: ["Cash", "Card"], required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Confirmed",
    },
  },
  { timestamps: true }
);

// in Booking schema file, after schema definition:
BookingSchema.index({ "passenger.contactNo": 1, createdAt: -1 });

export default mongoose.model("Booking", BookingSchema);
