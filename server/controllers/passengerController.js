import Passenger from "../models/Passenger.js";

// Utility: shape safe response (avoid leaking internal fields)
const pickPassenger = (p) =>
  p && {
    email: p.email,
    fname: p.fname,
    lname: p.lname,
    phone: p.phone,
    gender: p.gender,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };

// Create passenger
export async function createPassenger(req, res) {
  try {
    console.log("hi");
    const { phone, fname, lname, nic, email } = req.body || {};
    console.log(phone);
    if (!phone) return res.status(400).json({ message: "Phone required" });
    const existing = await Passenger.findOne({ phone });
    if (existing) return res.json(existing);
    const created = await Passenger.create({
      phone,
      fname: fname || "",
      lname: lname || "",
      nic: nic || "",
      email: email || "",
    });
    res.status(201).json(created);
  } catch {
    res.status(500).json({ message: "Failed" });
  }
}

/** Normalizer (keep it simple; enforce +94XXXXXXXXX format if you want stricter policy) */
const normalizePhone = (p = "") => String(p).trim();

export const getPassengerByPhoneController = async (req, res) => {
  try {
    const phoneParam = normalizePhone(req.params.phone);
    if (!phoneParam) {
      return res.status(400).json({ ok: false, message: "Phone is required." });
    }
    // Be lenient: callers may pass the number with or without a leading '+'
    // Try to find by exact match first, then fall back to common variants.
    const candidates = [phoneParam];
    if (!phoneParam.startsWith("+")) candidates.push("+" + phoneParam);
    else candidates.push(phoneParam.replace(/^\+/, ""));

    const passenger = await Passenger.findOne({
      phone: { $in: candidates },
    }).lean();
    if (!passenger) {
      return res
        .status(404)
        .json({ ok: false, message: "Passenger not found." });
    }

    return res.status(200).json({ ok: true, passenger });
  } catch (err) {
    console.error("getPassengerByPhone error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch passenger.",
      error: err?.message,
    });
  }
};

export const updatePassengerByPhoneController = async (req, res) => {
  try {
    const phoneParam = normalizePhone(req.params.phone);
    if (!phoneParam) {
      return res.status(400).json({ ok: false, message: "Phone is required." });
    }

    const { fname, lname, phone, gender, email } = req.body || {};

    // Validate gender against model enum
    if (
      !(
        gender === undefined ||
        gender === "" ||
        gender === "Male" ||
        gender === "Female"
      )
    ) {
      return res.status(400).json({
        ok: false,
        message: "Invalid gender. Use '', 'Male', or 'Female'.",
      });
    }

    // Optional: validate phone format if provided
    if (phone !== undefined) {
      const p = String(phone);
      if (!/^\+94\d{9}$/.test(p)) {
        return res
          .status(400)
          .json({ ok: false, message: "Phone must match +94XXXXXXXXX." });
      }
    }

    // Build update doc
    const update = {};
    if (fname !== undefined) update.fname = String(fname).trim();
    if (lname !== undefined) update.lname = String(lname).trim();
    if (gender !== undefined) update.gender = gender; // "", "Male", "Female"
    if (email !== undefined) update.email = email || ""; // optional
    if (phone !== undefined) update.phone = normalizePhone(phone);

    // If changing phone, ensure uniqueness
    if (update.phone && update.phone !== phoneParam) {
      const exists = await Passenger.findOne({ phone: update.phone }).lean();
      if (exists) {
        return res
          .status(409)
          .json({ ok: false, message: "Phone already in use." });
      }
    }

    const passenger = await Passenger.findOneAndUpdate(
      { phone: phoneParam },
      { $set: update },
      { new: true }
    ).lean();

    if (!passenger) {
      return res
        .status(404)
        .json({ ok: false, message: "Passenger not found." });
    }

    return res.status(200).json({ ok: true, passenger });
  } catch (err) {
    console.error("updatePassengerByPhone error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to update passenger.",
      error: err?.message,
    });
  }
};

/// Get passenger by email (from query param)
export const getPassengerByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    console.log("hyuy");
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email query param required" });
    }

    const passenger = await Passenger.findOne({ email });

    // Return empty array if not found
    if (!passenger) {
      return res.json({ success: true, data: false });
    }

    res.json({ success: true, data: passenger });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/passengers/by-email
 * body: { email, fname, lname, phone, gender }
 */
export async function updatePassengerByEmailController(req, res) {
  try {
    const { email, fname, lname, phone, gender } = req.body || {};

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    // basic validations (mirror client rules)
    if (!fname || !/^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(fname.trim())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid first name" });
    }
    if (!lname || !/^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(lname.trim())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid last name" });
    }
    if (!phone || !/^\+94\d{9}$/.test(phone)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid phone (+94xxxxxxxxx)" });
    }
    if (!["Male", "Female"].includes(gender)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid gender" });
    }

    const updated = await Passenger.findOneAndUpdate(
      { email },
      { fname: fname.trim(), lname: lname.trim(), phone, gender },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Passenger not found" });
    }

    return res.json({ success: true, data: pickPassenger(updated) });
  } catch (err) {
    console.error("updatePassengerByEmail error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export const logout = async (req, res) => {
  res.clearCookie("email");
  return res
    .status(200)
    .send({ success: true, message: "Logged out successfully" });
};
