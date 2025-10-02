// controllers/busController.js
import mongoose from "mongoose";
import Bus from "../models/Bus.js";

// small URL sanity check (same as model)
const isHttpsUrl = (v) => /^https?:\/\/.+/i.test(v || "");

/**
 * POST /api/buses
 * Create a new bus with full validation.
 */
export const createBus = async (req, res) => {
  try {
    const {
      busName,
      busNo,
      seats,
      price,
      imageUrl,
      route,
      schedule,
      type,
      frequency,
      pickups,
    } = req.body;

    // Quick top-level checks (friendlier errors before Mongoose kicks in)
    if (!imageUrl || !isHttpsUrl(imageUrl)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid imageUrl is required" });
    }
    if (
      !busName ||
      !busNo ||
      !seats ||
      !price ||
      !route ||
      !schedule ||
      !type ||
      !frequency
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const doc = new Bus({
      busName,
      busNo,
      seats,
      price,
      imageUrl,
      route,
      schedule,
      type,
      frequency,
      pickups,
    });

    const saved = await doc.save();
    return res.status(201).json({
      success: true,
      data: saved,
      message: "Bus added successfully",
    });
  } catch (err) {
    // Duplicate key (unique busNo)
    if (err?.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || "field";
      return res.status(409).json({
        success: false,
        message: `Duplicate ${field}: '${err.keyValue[field]}' already exists`,
      });
    }

    // Mongoose validation errors → present as a friendly list
    if (err?.name === "ValidationError") {
      const details = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: details,
      });
    }

    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * GET /api/buses
 * Return all buses (newest first)
 */
export const getBus = async (req, res) => {
  try {
    const docs = await Bus.find().sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Failed to fetch buses" });
  }
};

export const getBusById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId early
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus id",
      });
    }

    const doc = await Bus.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    return res.json({ success: true, data: doc });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch bus" });
  }
};
