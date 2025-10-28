// backend/models/Passenger.js
import mongoose from "mongoose";

const PassengerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    fname: { type: String, trim: true },
    lname: { type: String, trim: true },
    nic: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },

    walletBalance: { type: Number, default: 0 }, // NEW: wallet
  },
  { timestamps: true }
);

export default mongoose.model("Passenger", PassengerSchema);
