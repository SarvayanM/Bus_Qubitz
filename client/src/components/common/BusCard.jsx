import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Users,
  Tag,
  RefreshCw,
  ListChecks,
} from "lucide-react";
import { showTimetableToast } from "./TimetableToast";
import { getBookingsByBusAndDate } from "../../api/booking";

// Parse flexible time strings into minutes since midnight (0-1439)
function parseTimeFlexible(t) {
  if (t == null) return null;
  let s = String(t).trim();
  if (!s || s === "—" || s === "-" || s === "N/A") return null;
  s = s.replace(/\./g, ":").replace(/\s*(am|pm)$/i, " $1");
  let m = s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (m) {
    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ap = m[3]?.toUpperCase();
    if (ap) {
      if (ap === "PM" && hh !== 12) hh += 12;
      if (ap === "AM" && hh === 12) hh = 0;
      return hh * 60 + mm;
    }
    if (hh === 24) hh = 0;
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh * 60 + mm;
    return null;
  }
  m = s.match(/^(\d{1,2})(?:\s*(AM|PM))$/i);
  if (m) {
    let hh = parseInt(m[1], 10);
    const ap = m[2].toUpperCase();
    if (ap === "PM" && hh !== 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
    return hh * 60;
  }
  m = s.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (m) {
    let hh = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    if (hh === 24) hh = 0;
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh * 60 + mm;
  }
  return null;
}

const durationLabel = (departure, arrival, nextDay) => {
  const d = parseTimeFlexible(departure);
  const a = parseTimeFlexible(arrival);
  if (d == null || a == null) return "—";
  let diff = a - d;
  if (diff < 0 || nextDay) diff += 24 * 60;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hrs}h ${String(mins).padStart(2, "0")}m`;
};

function todayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function tomorrowISO() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// timetable toast moved to shared component: ./TimetableToast

export default function BusCard({ bus, date, onBook, isFiltered = false }) {
  const {
    _id,
    busNo = "N/A",
    busName = "",
    type = "Standard",
    frequency = "Regular",
    price = 0,
    // different APIs may return seats as `seats`, `seatsTotal` or provide `seatsAvailable`
    seats: seatsRaw = undefined,
    seatsTotal: seatsTotalRaw = undefined,
    seatsAvailable: seatsAvailableRaw = undefined,
    route = {},
    schedule = {},
    pickups = [],
  } = bus || {};

  const seatsTotal = Number(seatsTotalRaw ?? seatsRaw ?? 0);

  const { from = "—", to = "—" } = route;
  const { departure = "—", arrival = "—" } = schedule || {};

  const [opening, setOpening] = useState(false);
  // seed availability from server-provided seatsAvailable when present to avoid flicker
  const [availableSeats, setAvailableSeats] = useState(
    typeof seatsAvailableRaw === "number" ? seatsAvailableRaw : seatsTotal
  );
  const [loading, setLoading] = useState(true);

  // Compute which date to check for availability
  const today = todayISO();
  const tomorrow = tomorrowISO();

  // Determine label & date: always return an object { label, date }
  const computeLabel = () => {
    if (isFiltered) return { label: "Book Now", date: date || today };
    const depMinutes = parseTimeFlexible(
      departure || schedule?.departure || bus?.departureTime
    );
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (depMinutes == null)
      return { label: "Book for Tomorrow", date: tomorrow };
    if (depMinutes - nowMinutes >= 60)
      return { label: "Book for Today", date: today };
    return { label: "Book for Tomorrow", date: tomorrow };
  };

  const labelInfo = computeLabel();
  const label = labelInfo.label;
  const availDate = labelInfo.date;

  useEffect(() => {
    let mounted = true;
    async function fetchAvailableSeats() {
      setLoading(true);
      try {
        if (!_id || !availDate) {
          if (mounted) setAvailableSeats(seatsTotal);
          return;
        }
        const data = await getBookingsByBusAndDate(_id, availDate);
        const bookedSeats = [
          ...(data?.bookedByGents || []),
          ...(data?.bookedByLadies || []),
        ];
        const unavailable = data?.unavailableSeats || [];
        const totalBooked = new Set([...bookedSeats, ...unavailable]).size;
        if (mounted) setAvailableSeats(Math.max(0, seatsTotal - totalBooked));
      } catch (err) {
        console.error("Failed to fetch available seats:", err);
        if (mounted) setAvailableSeats(seatsTotal);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchAvailableSeats();
    return () => {
      mounted = false;
    };
  }, [_id, availDate, seatsTotal]);

  const openTimetable = () => {
    if (!pickups?.length) {
      toast("No timetable available", { icon: "ℹ️" });
      return;
    }
    setOpening(true);
    showTimetableToast(pickups, () => setOpening(false));
  };

  const departureMinutes = parseTimeFlexible(departure);
  const arrivalMinutes = parseTimeFlexible(arrival);
  const nextDayArrival =
    arrivalMinutes != null &&
    departureMinutes != null &&
    arrivalMinutes < departureMinutes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.25 }}
      className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden"
    >
      <div className="flex flex-col md:flex-row items-stretch">
        <div className="flex-1 p-4 sm:p-5">
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span>{from}</span>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{to}</span>
            <span className="ml-2 text-xs text-gray-500 font-medium">
              #{busNo}
            </span>
          </h3>

          <p className="text-gray-700 mb-3 flex flex-wrap items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{busName || "—"}</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-blue-800/90 bg-blue-50 px-2 py-0.5 rounded">
              {type}
            </span>
            <span className="text-sm text-blue-800/90 bg-blue-50 px-2 py-0.5 rounded">
              {frequency}
            </span>
          </p>

          <div className="grid grid-cols-3 items-center gap-3">
            <div className="text-center rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Clock className="w-4 h-4 text-blue-700" />
                <p className="text-[10px] font-semibold text-gray-500 tracking-wide">
                  DEPARTURE
                </p>
              </div>
              <p className="text-base font-bold">{departure}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {availDate || "-"}
              </p>
            </div>

            <div className="text-center bg-blue-50 rounded-lg border border-blue-200 px-3 py-2">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Clock className="w-4 h-4 text-blue-700" />
                <p className="text-[10px] font-semibold text-gray-500 tracking-wide">
                  APPROX. DURATION
                </p>
              </div>
              <p className="text-base font-bold text-blue-900">
                {durationLabel(departure, arrival, nextDayArrival)}
              </p>
            </div>

            <div
              className={`text-center rounded-lg border border-gray-200 px-3 py-2 ${
                nextDayArrival ? "bg-red-50" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Clock className="w-4 h-4 text-blue-700" />
                <p className="text-[10px] font-semibold text-gray-500 tracking-wide">
                  ARRIVAL
                </p>
              </div>
              <p className="text-base font-bold">{arrival}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {nextDayArrival ? "Midnight journey" : "Same day"}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-200 p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : availableSeats === 0 ? (
              <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-semibold text-sm">
                Fully Booked
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-700">
                <Users className="w-5 h-5 text-blue-700" />
                <span className="text-sm">Available Seats</span>
                <span className="font-semibold">
                  {availableSeats} / {seatsTotal}
                </span>
              </div>
            )}
            <div className="text-right">
              <p className="text-[11px] text-gray-500 font-semibold">
                STARTING FROM
              </p>
              <p className="text-xl font-extrabold text-blue-900">
                LKR {Number(price).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => onBook && onBook(_id, availDate)}
              disabled={availableSeats === 0}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-lg transition ${
                availableSeats === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-900 hover:bg-blue-800 text-white"
              }`}
            >
              <span>{availableSeats === 0 ? "No Seats" : label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              disabled={opening}
              onClick={openTimetable}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-2.5 rounded-lg transition"
              title="View timetable"
            >
              <ListChecks className="w-4 h-4 text-blue-800" />
              Timetable
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
