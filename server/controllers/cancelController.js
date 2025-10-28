// backend/controllers/cancelController.js
import Booking from "../models/Booking.js";
import Passenger from "../models/Passenger.js";
import CancelledBooking from "../models/CancelledBooking.js"; // <- ensure this import
import {
  toDepartureDate,
  refundPercent,
  parseMoneyToNumber,
  safeSeatsCount,
} from "../utils/serverTime.js";


export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ message: "reason is required" });

    const booking = await Booking.findById(id).populate({
      path: "busId",
      select: "price schedule departure busNo busName route operatorName plateNo from to",
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "Cancelled") {
      return res.status(400).json({ message: "Already cancelled" });
    }

    const passengerPhone = get(booking, "passenger.phone", "");
    if (!passengerPhone) {
      return res.status(400).json({ message: "No passenger phone on booking" });
    }
    if (!booking.travelDate) {
      return res.status(500).json({ message: "Booking travelDate missing" });
    }

    // ---- departure time & refund percent ----
    const busDoc = booking.busId;
    const departTime =
      booking.departureTime ||
      get(booking, "bus.departureTime") ||
      get(busDoc, "schedule.departure") ||
      get(busDoc, "departure") ||
      "00:00";

    const departAt = toDepartureDate(booking.travelDate, departTime);
    const hoursBefore = (departAt.getTime() - Date.now()) / 3600000;
    const pct = refundPercent(hoursBefore);

    if (pct < 0) {
      return res.status(400).json({ message: "Cancellation window has passed (< 4 hours)" });
    }

    // ---- determine base price ----
    const rawBusPrice = get(busDoc, "price", get(booking, "bus.price"));
    const busPrice = parseMoneyToNumber(rawBusPrice);
    if (Number.isNaN(busPrice) || busPrice <= 0) {
      return res.status(400).json({
        message: "Bus price is invalid or missing; cannot compute refund for cancellation.",
        debug: { rawBusPrice },
      });
    }

    const seatsCount = safeSeatsCount(booking.seats);
    const baseAmount = busPrice * seatsCount;
    if (!isFinite(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({
        message: "Computed base amount is invalid.",
        debug: { busPrice, seatsCount, baseAmount },
      });
    }

    // ---- compute refund ----
    const refundedAmount = Math.max(0, Math.round((baseAmount * pct) / 100));
    if (!isFinite(refundedAmount)) {
      return res.status(400).json({
        message: "Refund amount calculation failed.",
        debug: { baseAmount, pct, refundedAmount },
      });
    }

    // ---- credit wallet ----
    const passenger = await Passenger.findOne({ phone: passengerPhone });
    if (!passenger) return res.status(404).json({ message: "Passenger not found" });

    const currentWallet = parseMoneyToNumber(passenger.walletBalance);
    const safeWallet = Number.isNaN(currentWallet) ? 0 : currentWallet;
    passenger.walletBalance = safeWallet + refundedAmount;
    await passenger.save();

    // ---- BUILD SNAPSHOT (critical: never undefined) ----
    const bookingSnapshot = {
      travelDate: booking.travelDate || null,
      departureTime: booking.departureTime || get(booking, "bus.schedule.departure") || null,
      seats: Array.isArray(booking.seats) ? booking.seats.map((s) => (typeof s === "object" ? { ...s } : s)) : [],
      pickup: booking.pickup || null,
      drop: booking.drop || null,
      payment: booking.payment || null,
      createdAt: booking.createdAt || new Date(),
      status: "Cancelled",
      passenger: {
        fname: get(booking, "passenger.fname", null),
        lname: get(booking, "passenger.lname", null),
        phone: passengerPhone,
        nic: get(booking, "passenger.nic", null),
        email: get(booking, "passenger.email", null),
      },
      bus: {
        from: get(booking, "bus.from", get(busDoc, "from", null)),
        to: get(booking, "bus.to", get(busDoc, "to", null)),
        operatorName: get(booking, "bus.operatorName", get(busDoc, "operatorName", null)),
        plateNo: get(booking, "bus.plateNo", get(busDoc, "plateNo", null)),
        busNo: get(booking, "bus.busNo", get(busDoc, "busNo", null)),
        busName: get(booking, "bus.busName", get(busDoc, "busName", null)),
        price: get(busDoc, "price", get(booking, "bus.price", null)),
        route: {
          from: get(busDoc, "route.from", get(booking, "bus.route.from", null)),
          to: get(busDoc, "route.to", get(booking, "bus.route.to", null)),
        },
        schedule: {
          departure: get(busDoc, "schedule.departure", get(booking, "bus.schedule.departure", null)),
        },
        departureTime: get(booking, "bus.departureTime", null),
      },
    };

    // Hard guard: if for any reason bookingSnapshot is falsy
    if (!bookingSnapshot || typeof bookingSnapshot !== "object") {
      console.error("cancelBooking: bookingSnapshot missing/invalid", { id, reason });
      return res.status(500).json({ message: "Internal error: booking snapshot failed" });
    }

    // ---- store cancelled booking (with snapshot) ----
    const cancelledDoc = await CancelledBooking.create({
      passengerPhone,
      reason,
      refundPercent: pct,
      refundedAmount,
      processedAt: new Date(),
      booking: bookingSnapshot, // REQUIRED
      meta: {
        travelDate: booking.travelDate,
        departTime,
        busId: get(booking, "busId._id"),
        busPrice,
        seatsCount,
        baseAmount,
      },
    });

    // ---- remove live booking ----
    await booking.deleteOne();

    return res.json({
      refundedAmount,
      refundPercent: pct,
      walletBalance: passenger.walletBalance,
      cancelledId: cancelledDoc._id,
      debug: {
        seatsCount,
        baseAmount,
        busPriceUsed: busPrice,
        percentApplied: pct,
      },
    });
  } catch (e) {
    console.error("cancelBooking error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function listCancelledByPhone(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: "phone is required" });

    const items = await CancelledBooking.find({ passengerPhone: phone })
      .sort({ processedAt: -1 })
      .lean();

    let passenger = null;
    if (items.length > 0) {
      const p = items[0]?.booking?.passenger;
      if (p) passenger = { fname: p.fname, lname: p.lname, phone: p.phone };
    }

    return res.json({ count: items.length, items, passenger });
  } catch (e) {
    console.error("listCancelledByPhone error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
