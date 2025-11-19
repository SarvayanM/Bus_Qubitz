// server/controllers/dashboardController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import CancelledBooking from "../models/CancelledBooking.js";
import Bus from "../models/Bus.js";
import { getRangeDates, computeDeltaPercent } from "../utils/dateRange.js";

const { ObjectId } = mongoose.Types;

export const getDashboardStats = async (req, res) => {
  try {
    const { companyId, rangeType = "today", from, to, busId } = req.query;

    if (!companyId || !ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Valid companyId is required" });
    }

    const range = getRangeDates(rangeType, from, to);
    const { from: fromStr, to: toStr, previous } = range;

    // ✅ Filter buses by company + optional busId
    const busFilter = { companyId };
    if (busId && ObjectId.isValid(busId)) {
      busFilter._id = new ObjectId(busId);
    }

    const buses = await Bus.find(busFilter).select(
      "_id busName route schedule price seats"
    );
    const busIds = buses.map((b) => b._id);

    if (busIds.length === 0) {
      return res.json({
        kpis: {
          totalBuses: { value: 0, deltaPercent: 0 },
          totalBookings: { value: 0, deltaPercent: 0 },
          revenue: { value: 0, deltaPercent: 0 },
          cancellations: { value: 0, deltaPercent: 0 },
          occupancyRate: { value: 0, deltaPercent: 0 },
          trips: { value: 0, deltaPercent: 0 },
        },
        charts: {
          bookingsTrend: [],
          revenueTrend: [],
        },
        insights: {
          topRoutes: [],
          topBuses: [],
          topCancelledRoutes: [],
        },
        range,
      });
    }

    const bookingFilterCurrent = {
      busId: { $in: busIds },
      travelDate: { $gte: fromStr, $lte: toStr },
    };

    const bookingFilterPrev = {
      busId: { $in: busIds },
      travelDate: { $gte: previous.from, $lte: previous.to },
    };

    const [currentBookings, prevBookings, currentCancelled, prevCancelled] =
      await Promise.all([
        Booking.find(bookingFilterCurrent).populate(
          "busId",
          "busName route schedule price seats"
        ),
        Booking.find(bookingFilterPrev),
        CancelledBooking.find({
          "meta.busId": { $in: busIds },
          "meta.travelDate": { $gte: fromStr, $lte: toStr },
        }),
        CancelledBooking.find({
          "meta.busId": { $in: busIds },
          "meta.travelDate": { $gte: previous.from, $lte: previous.to },
        }),
      ]);

    // --- KPI calculations ---
    const totalBusesVal = buses.length;
    const totalBookingsCurrent = currentBookings.length;
    const totalBookingsPrev = prevBookings.length;

    const totalRevenueCurrent = currentBookings.reduce((sum, b) => {
      const price = b.busId?.price || 0;
      const seatsCount = b.seats?.length || 0;
      return sum + price * seatsCount;
    }, 0);

    // For simplicity, keep previous revenue 0 (or calculate via extra populate if needed)
    const totalRevenuePrev = 0;

    const cancellationsCurrent = currentCancelled.length;
    const cancellationsPrev = prevCancelled.length;

    const totalSeatsCapacity = currentBookings.reduce((sum, b) => {
      const busSeats = b.busId?.seats || 0;
      return sum + busSeats;
    }, 0);

    const totalSeatsBooked = currentBookings.reduce(
      (sum, b) => sum + (b.seats?.length || 0),
      0
    );

    const occupancyRateCurrent =
      totalSeatsCapacity > 0
        ? (totalSeatsBooked / totalSeatsCapacity) * 100
        : 0;

    const occupancyRatePrev = 0;

    const tripsCurrent = currentBookings.length;
    const tripsPrev = prevBookings.length;

    const kpis = {
      totalBuses: {
        value: totalBusesVal,
        deltaPercent: 0,
      },
      totalBookings: {
        value: totalBookingsCurrent,
        deltaPercent: computeDeltaPercent(
          totalBookingsCurrent,
          totalBookingsPrev
        ),
      },
      revenue: {
        value: totalRevenueCurrent,
        deltaPercent: computeDeltaPercent(
          totalRevenueCurrent,
          totalRevenuePrev
        ),
      },
      cancellations: {
        value: cancellationsCurrent,
        deltaPercent: computeDeltaPercent(
          cancellationsCurrent,
          cancellationsPrev
        ),
      },
      occupancyRate: {
        value: occupancyRateCurrent,
        deltaPercent: computeDeltaPercent(
          occupancyRateCurrent,
          occupancyRatePrev
        ),
      },
      trips: {
        value: tripsCurrent,
        deltaPercent: computeDeltaPercent(tripsCurrent, tripsPrev),
      },
    };

    // --- Charts ---
    const bookingsTrend = [];
    const revenueTrend = [];

    const fromDateObj = new Date(fromStr);
    const toDateObj = new Date(toStr);

    for (
      let d = new Date(fromDateObj);
      d <= toDateObj;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayBookings = currentBookings.filter(
        (b) => b.travelDate === dateStr
      );
      const count = dayBookings.length;
      const amount = dayBookings.reduce((sum, b) => {
        const price = b.busId?.price || 0;
        const seatsCount = b.seats?.length || 0;
        return sum + price * seatsCount;
      }, 0);

      bookingsTrend.push({ date: dateStr, count });
      revenueTrend.push({ date: dateStr, amount });
    }

    // --- Insights ---
    const routeMap = new Map();
    currentBookings.forEach((b) => {
      const fromRoute = b.busId?.route?.from;
      const toRoute = b.busId?.route?.to;
      if (!fromRoute || !toRoute) return;
      const key = `${fromRoute} → ${toRoute}`;
      const price = b.busId?.price || 0;
      const seatsCount = b.seats?.length || 0;
      const revenue = price * seatsCount;
      const existing = routeMap.get(key) || {
        route: key,
        bookings: 0,
        revenue: 0,
      };
      existing.bookings += 1;
      existing.revenue += revenue;
      routeMap.set(key, existing);
    });
    const topRoutes = Array.from(routeMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const busMap = new Map();
    currentBookings.forEach((b) => {
      const busName = b.busId?.busName;
      if (!busName) return;
      const price = b.busId?.price || 0;
      const seatsCount = b.seats?.length || 0;
      const revenue = price * seatsCount;
      const existing = busMap.get(busName) || {
        busName,
        bookings: 0,
        revenue: 0,
      };
      existing.bookings += 1;
      existing.revenue += revenue;
      busMap.set(busName, existing);
    });
    const topBuses = Array.from(busMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const cancelledRouteMap = new Map();
    currentCancelled.forEach((cDoc) => {
      const fromRoute = cDoc.booking?.bus?.route?.from;
      const toRoute = cDoc.booking?.bus?.route?.to;
      if (!fromRoute || !toRoute) return;
      const key = `${fromRoute} → ${toRoute}`;
      const existing = cancelledRouteMap.get(key) || {
        route: key,
        cancellations: 0,
      };
      existing.cancellations += 1;
      cancelledRouteMap.set(key, existing);
    });
    const topCancelledRoutes = Array.from(cancelledRouteMap.values())
      .sort((a, b) => b.cancellations - a.cancellations)
      .slice(0, 5);

    return res.json({
      kpis,
      charts: { bookingsTrend, revenueTrend },
      insights: { topRoutes, topBuses, topCancelledRoutes },
      range,
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};
