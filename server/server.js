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
import journeysRoutes from "./routes/journeysRoutes.js";
import cancelRoutes from "./routes/cancelRoutes.js";
import dotenv from "dotenv";

const app = express();
dotenv.config();
// --- CORS ---
const allowedOrigins = [
  process.env.CLIENT_URL, // optional: set in Render env vars
  "https://bookmybus-client2.onrender.com", // deployed frontend
  "http://localhost:5173",                 // local dev (optional)
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (e.g. Postman) where origin is undefined
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
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
app.use("/api/journeys", journeysRoutes);
app.use("/api", cancelRoutes);
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
