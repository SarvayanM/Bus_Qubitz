import mongoose from "mongoose";

const PassengerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Email format invalid"],
    },
    fname: { type: String, required: true, trim: true },
    lname: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      match: [/^\+94\d{9}$/, "Phone must start with +94 and have 9 digits"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Passenger", PassengerSchema);
