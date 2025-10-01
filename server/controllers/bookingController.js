import Booking from "../models/Booking.js";
import Bus from "../models/Bus.js";

export const createBooking = async (req, res) => {
  try {
    const {
      email,
      busId,
      travelDate,
      seats,
      passenger,
      pickup,
      drop,
      payment,
    } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is missing" });
    }

    if (!busId || !travelDate || !seats?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Ensure bus exists
    const bus = await Bus.findById(busId);
    if (!bus)
      return res.status(404).json({ success: false, message: "Bus not found" });

    // Prevent double booking (seat already taken)
    const existing = await Booking.findOne({
      bus: busId,
      travelDate,
      seats: { $in: seats },
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "One or more seats already booked" });
    }

    const booking = await Booking.create({
      email: email,
      bus: busId,
      travelDate,
      seats,
      passenger,
      pickup,
      drop,
      payment,
    });

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("bus");
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
