import Passenger from "../models/Passenger.js";

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
    console.log("hyuy")
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

export const logout = async (req, res) => {
  res.clearCookie("email");
  return res
    .status(200)
    .send({ success: true, message: "Logged out successfully" });
};
