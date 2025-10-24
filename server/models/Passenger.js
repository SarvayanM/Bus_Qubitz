// backend/models/Passenger.js
import mongoose from "mongoose";

const PassengerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    fname: { type: String, trim: true },
    lname: { type: String, trim: true },
    gender: { type: String, enum: ["Male", "Female", ""], default: "" },
    walletBalance: { type: Number, default: 0 }, // NEW: wallet
    email: { type: String, trim: true }, // optional
  },
  { timestamps: true }
);

export default mongoose.model("Passenger", PassengerSchema);
