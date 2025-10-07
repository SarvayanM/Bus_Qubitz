// server.js (or app.js)
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import cors from "cors";
import busRoutes from "./routes/busRoutes.js";
import passengerRoutes from "./routes/passengerRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import dotenv from "dotenv";

const app = express();
dotenv.config();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// API
app.use("/api/buses", busRoutes);
console.log("1");
app.use("/api/passengers", passengerRoutes);
console.log("2");
app.use("/api/bookings", bookingRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// Errors: 404 fallback
app.use((req, res) => {
  console.log("3");
  res.status(404).json({ success: false, message: "Not Found" });
});

// --- Connect & start ---
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/busdb";
const PORT = 4000;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`API running on :${PORT}`));
  })
  .catch((e) => {
    console.error("Mongo connection error:", e);
    process.exit(1);
  });
