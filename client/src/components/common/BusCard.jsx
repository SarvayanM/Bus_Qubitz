import { useEffect, useState } from "react";

import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Users,
  RefreshCw,
  ListChecks,
  Bus,
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
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2] || "0", 10);
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh * 60 + mm;
  }
  return null;
}

function durationLabel(departure, arrival, nextDay) {
  const dep = parseTimeFlexible(departure);
  const arr = parseTimeFlexible(arrival);
  if (dep == null || arr == null) return "—";
  let mins = arr - dep;
  if (mins < 0 || nextDay) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Hr`;
  return `${h} Hr ${m} Min`;
}

function formatDateISO(d) {
  if (!d) return null;
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BusCard({
  bus = {},
  date = null,
  onBook,
  isFiltered = false,
}) {
  const {
    _id,
    busNo,
    busName,
    type = "",
    frequency = "Regular",
    price = 0,
    seats: seatsRaw,
    seatsTotal: seatsTotalRaw,
    seatsAvailable: seatsAvailableRaw,
    route = {},
    schedule = {},
    pickups = [],
  } = bus || {};

  const seatsTotal = Number(seatsTotalRaw ?? seatsRaw ?? 0);
  const { from = "—", to = "—" } = route;
  const { departure = "—", arrival = "—" } = schedule || {};

  const availDate = formatDateISO(date) || formatDateISO(new Date());

  const [availableSeats, setAvailableSeats] = useState(
    typeof seatsAvailableRaw === "number" ? seatsAvailableRaw : seatsTotal
  );
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);

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
    if (!pickups || pickups.length === 0) {
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

  const label = isFiltered ? "View & Book" : "Book Now";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition cursor-default"
    >
      <div className="flex flex-col md:flex-row items-stretch">
        {/* Left: route & times */}
        <div className="flex-1 p-5 md:p-6">
          <h3 className="text-[18px] md:text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <span className="truncate">{from}</span>
            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="truncate">{to}</span>
            {busNo && (
              <span className="ml-2 text-[11px] leading-5 text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                #{busNo}
              </span>
            )}
          </h3>

          {/* Bus meta row with icon + colored chips */}
          <p className="text-slate-700 mb-3 flex flex-wrap items-center gap-2">
            <Bus className="w-4 h-4 text-blue-900" />
            <span className="font-medium text-slate-900 text-[12px] bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              {busName || "—"}
            </span>
            <span className="text-[12px] bg-violet-50 border border-violet-200 text-violet-900 px-2 py-0.5 rounded-full">
              {type}
            </span>
            <span className="text-[12px] bg-emerald-50 border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
              {frequency}
            </span>
          </p>

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {/* Departure (no date shown) */}
            <div className="text-center rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Clock className="w-4 h-4 text-blue-900" />
                <p className="text-[10px] font-semibold text-slate-500 tracking-wide">
                  DEPARTURE
                </p>
              </div>
              <p className="text-base md:text-lg font-bold text-slate-900">
                {departure}
              </p>
              {/* From / To below the time */}
              <div className="mt-1 text-[11px] text-slate-600">
                <div>
                  <span className="font-medium">From:</span> {from}
                </div>
              </div>
            </div>

            {/* Duration with lighter continuous arrow line */}
            <div className="text-center rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-blue-900" />
                <p className="text-[10px] font-semibold text-slate-700 tracking-wide">
                  DURATION (APPROXIMATE)
                </p>
              </div>

              {/* Arrow line with duration text centered and clearly visible */}
              <div className="relative w-full">
                <svg
                  className="w-full h-6 text-slate-300"
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="6"
                      markerHeight="6"
                      refX="5"
                      refY="3"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 6 3, 0 6"
                        fill="currentColor"
                        opacity="0.9"
                      ></polygon>
                    </marker>
                  </defs>
                  <line
                    x1="0"
                    y1="3"
                    x2="98"
                    y2="3"
                    stroke="currentColor"
                    strokeWidth="1"
                    markerEnd="url(#arrowhead)"
                    opacity="0.9"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-sm md:text-base font-extrabold text-blue-900 px-1 rounded bg-white/85">
                    {durationLabel(departure, arrival, nextDayArrival)}
                  </span>
                </div>
              </div>

              {/* From → To under the arrow */}
              <p className="text-[11px] text-slate-700 mt-1">
                {from} <span className="text-slate-400">→</span> {to}
              </p>
            </div>

            {/* Arrival with neutral indicator */}
            <div className="text-center rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-900" />
                  <p className="text-[10px] font-semibold text-slate-500 tracking-wide">
                    ARRIVAL
                  </p>
                </div>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                    nextDayArrival
                      ? "bg-slate-50 text-slate-700 border-slate-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {nextDayArrival ? "Next day" : "Same day"}
                </span>
              </div>
              <p className="text-base md:text-lg font-bold text-slate-900">
                {arrival}
              </p>
              {/* From / To below the time */}
              <div className="mt-1 text-[11px] text-slate-600">
                <div>
                  <span className="font-medium">To:</span> {to}
                </div>
              </div>
            </div>
          </div>

          {nextDayArrival && (
            <div className="mt-3 rounded-md border-l-4 border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm text-slate-700 font-medium">
                Midnight Journey: This trip starts at night and ends the next
                day. Please plan your travel accordingly.
              </p>
            </div>
          )}
        </div>

        {/* Right: price & actions */}
        <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col items-center justify-center text-center gap-4">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Checking seats...</span>
            </div>
          ) : availableSeats === 0 ? (
            <div className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-semibold text-sm">
              Fully Booked
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 text-slate-700">
                <Users className="w-5 h-5 text-blue-900" />
                <div className="text-sm">Available Seats</div>
                <div className="font-semibold text-emerald-700 text-lg">
                  {availableSeats}
                </div>
                <div className="text-slate-400">/</div>
                <div className="font-semibold text-slate-900">{seatsTotal}</div>
              </div>
            </div>
          )}

          <div className="leading-tight">
            <p className="text-2xl md:text-3xl font-extrabold text-blue-900">
              LKR {Number(price).toFixed(2)}
            </p>
          </div>

          <div className="flex gap-2.5 w-full justify-center">
            <button
              onClick={() => onBook && onBook(_id, availDate)}
              disabled={availableSeats === 0}
              className={`inline-flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-200 hover:shadow-sm ${
                availableSeats === 0
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed w-full"
                  : "bg-blue-900 hover:bg-blue-800 text-white shadow-sm w-full md:w-auto cursor-pointer"
              }`}
              title={
                availableSeats === 0
                  ? "No seats available"
                  : "Proceed to booking"
              }
            >
              <span>{availableSeats === 0 ? "No Seats" : label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              disabled={opening}
              onClick={openTimetable}
              className={`inline-flex items-center justify-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-semibold px-5 py-3 rounded-lg transition w-full md:w-auto ${
                opening
                  ? "cursor-wait opacity-70"
                  : "cursor-pointer hover:shadow-sm"
              }`}
              title="View timetable"
            >
              <ListChecks className="w-4 h-4 text-blue-900" />
              Timetable
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
