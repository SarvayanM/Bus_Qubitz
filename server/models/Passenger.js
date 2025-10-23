import mongoose from "mongoose";

const PassengerSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,

      unique: true,
    },
    fname: { type: String, trim: true },
    lname: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Passenger", PassengerSchema);
