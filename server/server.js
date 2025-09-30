// server.js (or app.js)
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import cors from "cors";
import busRoutes from "./routes/busRoutes.js";
import passengerRoutes from "./routes/passengerRoutes.js";
import dotenv from "dotenv";

const app = express();
dotenv.config();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// API
app.use("/api/buses", busRoutes);
app.use("/api/passengers", passengerRoutes);

// Errors: 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

// --- Connect & start ---
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/busdb";
const PORT = process.env.PORT || 4000;

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
