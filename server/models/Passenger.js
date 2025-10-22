import mongoose from "mongoose";

const PassengerSchema = new mongoose.Schema(
  {
    fname: { type: String, required: true, trim: true },
    lname: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      match: [/^\+\d{6,15}$/, "Invalid phone"],
      unique: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Passenger", PassengerSchema);
