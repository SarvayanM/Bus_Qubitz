// controllers/busController.js
import mongoose from "mongoose";
import Bus from "../models/Bus.js";

// small URL sanity check (same as model)
const isHttpsUrl = (v) => /^https?:\/\/.+/i.test(v || "");
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function addDays(dateStr, days) {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const d = new Date(Y, M - 1, D);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/* sanitize allowed fields */
function toUpdate(doc = {}) {
  const out = {};
  if (doc.companyId) out.companyId = doc.companyId;
  if (doc.busName) out.busName = doc.busName;
  if (doc.busNo) out.busNo = doc.busNo;
  if (doc.seats != null) out.seats = Number(doc.seats);
  if (doc.price != null) out.price = Number(doc.price);
  if (doc.imageUrl != null) out.imageUrl = doc.imageUrl;
  if (doc.type) out.type = doc.type;
  if (doc.frequency) out.frequency = doc.frequency;

  if (doc.route && typeof doc.route === "object") {
    out.route = {
      from: doc.route.from,
      to: doc.route.to,
    };
  }
  if (doc.schedule && typeof doc.schedule === "object") {
    out.schedule = {
      departure: doc.schedule.departure,
      arrival: doc.schedule.arrival,
      nextDayArrival: !!doc.schedule.nextDayArrival,
    };
  }
  if (Array.isArray(doc.pickups)) {
    out.pickups = doc.pickups.map((p) => ({ place: p.place, time: p.time }));
  }
  return out;
}

/**
 * POST /api/buses
 * Create a new bus with full validation.
 */
export const createBus = async (req, res) => {
  try {
    const {
      companyId,
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
      !companyId ||
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
      companyId,
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

/**
 * GET /api/buses/by-company/:companyId
 */
export async function getBusesByCompany(req, res) {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing companyId" });
    }
    const list = await Bus.find({ companyId })
      .select(
        "_id busName busNo route schedule frequency type price seats pickups companyId"
      )
      .lean();
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("getBusesByCompany error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/buses/:id/available-dates?from=YYYY-MM-DD&days=30
 * - Uses bus.frequency ("Daily" | "Every Other Day") and bus.schedule.departure.
 * - Excludes past dates and (optionally) today if within 2 hours of departure.
 */
export async function getAvailableDatesForBus(req, res) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid bus id" });
    }
    const bus = await Bus.findById(id).select("frequency schedule").lean();
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }

    const from = req.query.from || ymd(new Date());
    const days = Math.max(1, Math.min(120, Number(req.query.days || 30))); // cap to 120 for safety
    const step = bus.frequency === "Every Other Day" ? 2 : 1;

    // Exclude "today" if less than 2 hours to departure
    const dep = toMinutes(bus?.schedule?.departure);
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const excludeToday =
      from === ymd(now) && dep !== null && dep - nowMin < 120;

    const out = [];
    let current = from;

    // If today is excluded, start from tomorrow
    if (excludeToday) {
      current = addDays(from, 1);
    }

    // Generate days based on frequency
    for (let i = 0; i < days; i += step) {
      const nextDate = i === 0 ? current : addDays(current, step);
      current = nextDate;
      out.push(nextDate);
    }

    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("getAvailableDatesForBus error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* PUT /api/buses/:id */
export async function updateBus(req, res) {
  try {
    const { id } = req.params;
    const payload = toUpdate(req.body || {});

    // very light validations
    if (!payload.busName || !payload.busNo) {
      return res
        .status(400)
        .json({ success: false, message: "busName and busNo are required" });
    }
    if (!payload.route?.from || !payload.route?.to) {
      return res
        .status(400)
        .json({
          success: false,
          message: "route.from and route.to are required",
        });
    }
    if (!payload.schedule?.departure || !payload.schedule?.arrival) {
      return res
        .status(400)
        .json({
          success: false,
          message: "schedule.departure and schedule.arrival are required",
        });
    }

    const updated = await Bus.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated)
      return res.status(404).json({ success: false, message: "Bus not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateBus error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* DELETE /api/buses/:id */
export async function removeBus(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Bus.findByIdAndDelete(id).lean();
    if (!deleted)
      return res.status(404).json({ success: false, message: "Bus not found" });
    return res.json({ success: true, data: { _id: id } });
  } catch (err) {
    console.error("removeBus error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
