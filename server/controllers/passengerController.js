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
export const createPassenger = async (req, res) => {
  try {
    const passenger = new Passenger(req.body);
    await passenger.save();
    res.status(201).json({ success: true, data: passenger });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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
