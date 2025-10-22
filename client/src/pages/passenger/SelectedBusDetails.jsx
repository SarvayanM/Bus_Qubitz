// src/pages/SelectedBusDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { getBusesList } from "../../api/bus";
import { getBookingsByBusAndDate } from "../../api/booking";
import BusLoader from "../../components/bus/BusLoader";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  Tag,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ListChecks,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** Utility: yyyy-mm-dd with local timezone (Asia/Colombo) */
function todayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ----------------------------- Small utilities ----------------------------- */
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Parse "05:40 AM" -> minutes since 00:00
const parseTime12 = (t) => {
  if (!t || typeof t !== "string") return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;
  return hh * 60 + mm;
};

// Compute duration string between departure & arrival, respecting nextDayArrival
// Accepts: "7:10AM", "07:10 AM", "07.10 am", "07:10", "7 AM", "19:05"
// Returns minutes since 00:00 or null
const parseTimeFlexible = (t) => {
  if (t == null) return null;
  let s = String(t).trim();

  // Treat fancy dashes or placeholders as missing
  if (!s || s === "—" || s === "-" || s === "N/A") return null;

  // Normalize separators and spacing, e.g., "07.10am" -> "07:10 am"
  s = s.replace(/\./g, ":").replace(/\s*(am|pm)$/i, " $1");

  // 1) hh:mm with optional AM/PM
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
    // No AM/PM → assume 24h clock
    if (hh === 24) hh = 0;
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh * 60 + mm;
    return null;
  }

  // 2) "h AM/PM" (no minutes)
  m = s.match(/^(\d{1,2})(?:\s*(AM|PM))$/i);
  if (m) {
    let hh = parseInt(m[1], 10);
    const ap = m[2].toUpperCase();
    if (ap === "PM" && hh !== 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
    return hh * 60;
  }

  // 3) Pure 24h "HH" or "HH:MM" fallback
  m = s.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (m) {
    let hh = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    if (hh === 24) hh = 0;
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh * 60 + mm;
  }

  return null;
};

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

/* ---------------------------- Timetable Toast UI --------------------------- */
function showTimetableToast(pickups = [], onClose) {
  const id = toast.custom(
    (t) => (
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        className={`w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden ${
          t.visible ? "animate-in" : "animate-out"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <ListChecks className="w-4 h-4 text-blue-700" />
            Timetable
          </div>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onClose?.();
            }}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5">
          {/* Boarding Points (top -> bottom) */}
          <div className="rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700" />
              <p className="text-sm font-semibold text-gray-800">
                Boarding Points
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-gray-500">
                    <th className="py-2 px-3 text-left font-medium">#</th>
                    <th className="py-2 px-3 text-left font-medium">
                      Location
                    </th>
                    <th className="py-2 px-3 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {pickups.map((p, i) => (
                    <tr
                      key={`${p.place}-${p.time}-${i}`}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-600">{i + 1}</td>
                      <td className="py-2 px-3 text-gray-900">{p.place}</td>
                      <td className="py-2 px-3 text-blue-700 font-medium">
                        {p.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drop-off Points (bottom -> top) */}
          <div className="rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700" />
              <p className="text-sm font-semibold text-gray-800">
                Drop-off Points
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-gray-500">
                    <th className="py-2 px-3 text-left font-medium">#</th>
                    <th className="py-2 px-3 text-left font-medium">
                      Location
                    </th>
                    <th className="py-2 px-3 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pickups].reverse().map((p, idx, arr) => (
                    <tr
                      key={`drop-${p.place}-${p.time}-${idx}`}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-600">
                        {arr.length - idx}
                      </td>
                      <td className="py-2 px-3 text-gray-900">{p.place}</td>
                      <td className="py-2 px-3 text-blue-700 font-medium">
                        {p.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    ),
    { duration: 600000 } // stay until closed
  );
  return id;
}

/* ========================================================================== */
/*                                 PAGE VIEW                                  */
/* ========================================================================== */
export default function SelectedBusDetails({ userName = "" }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const [qFrom, setQFrom] = useState((searchParams.get("from") || "").trim());
  const [qTo, setQTo] = useState((searchParams.get("to") || "").trim());
  const [qDate, setQDate] = useState((searchParams.get("date") || "").trim());

  // Booking form state (for search form)
  const [from, setFrom] = useState(qFrom);
  const [to, setTo] = useState(qTo);
  const [date, setDate] = useState(qDate || todayISO());

  // Form errors
  const [formError, setFormError] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [buses, setBuses] = useState([]);

  // Sync form fields with URL params when they change
  useEffect(() => {
    const fromParam = searchParams.get("from") || "";
    const toParam = searchParams.get("to") || "";
    const dateParam = searchParams.get("date") || "";

    setQFrom(fromParam.trim());
    setQTo(toParam.trim());
    setQDate(dateParam.trim());
    setFrom(fromParam.trim());
    setTo(toParam.trim());
    setDate(dateParam.trim() || todayISO());
  }, [searchParams]);

  // Fetch all buses once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const list = await getBusesList();
        if (!mounted) return;
        setBuses(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!mounted) return;
        setErr("load_failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const locations = useMemo(() => {
    const set = new Set();
    for (const b of buses) {
      const f = b?.route?.from?.trim();
      const t = b?.route?.to?.trim();
      if (f) set.add(f);
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [buses]);

  // Keep a clean error state on field changes
  useEffect(() => {
    setFormError("");
  }, [from, to, date]);

  /** Validate & submit */
  const handleSearch = (e) => {
    e.preventDefault();

    if (!from || !to || !date) {
      return setFormError("Please select From, To and a valid Date.");
    }
    if (from === to) {
      return setFormError("From and To cannot be the same location.");
    }

    // Validate date >= today
    const selected = new Date(date);
    const min = new Date(todayISO());
    if (selected < min) {
      return setFormError("Please choose a date that is today or later.");
    }

    // Update URL params and trigger search
    const params = new URLSearchParams({ from, to, date }).toString();
    navigate(`/selectedBusDetails?${params}`);
    setFormError("");
  };

  // Case-insensitive filter by both from and to
  const matches = useMemo(() => {
    const f = qFrom.toLowerCase();
    const t = qTo.toLowerCase();
    return (buses || []).filter((b) => {
      const from = (b?.route?.from || "").trim().toLowerCase();
      const to = (b?.route?.to || "").trim().toLowerCase();
      return from === f && to === t;
    });
  }, [buses, qFrom, qTo]);

  const handleBook = (busId) => {
    if (!qDate) {
      toast.error("Please choose a date on the home page.");
      return;
    }
    navigate(
      `/busBookingDashboard?busId=${encodeURIComponent(
        busId
      )}&from=${encodeURIComponent(qFrom)}&to=${encodeURIComponent(
        qTo
      )}&date=${encodeURIComponent(qDate)}`
    );
  };

  return (
    <div
      className="min-h-screen text-gray-900 py-10 pt-24"
      style={{
        backgroundColor: "#ffffff",
      }}
    >
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to search
            </Link>
          </div>
          <form
            onSubmit={handleSearch}
            className="w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-6 sm:p-8 text-left transform hover:scale-[1.01] transition-all duration-500 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* From */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  From
                </label>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-12 rounded-xl border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                >
                  <option value="">Select origin</option>
                  {locations.map((loc) => (
                    <option key={`from-${loc}`} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* To */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  To
                </label>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-12 rounded-xl border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                >
                  <option value="">Select destination</option>
                  {locations.map((loc) => (
                    <option
                      key={`to-${loc}`}
                      value={loc}
                      disabled={loc === from}
                    >
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 rounded-xl border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md [color-scheme:light]"
                />
              </div>

              {/* Submit */}
              <div className="flex md:justify-end">
                <button
                  type="submit"
                  className="w-full md:w-auto bg-blue-900 hover:bg-blue-1000 text-white font-semibold h-12 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 group"
                >
                  <svg
                    className="w-5 h-5 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Search Buses {userName && `, ${userName}`}!
                </button>
              </div>
            </div>

            {formError && (
              <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-shake flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {formError}
              </div>
            )}
          </form>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-5">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-blue-700">
              Available Buses
            </span>
          </h1>

          {/* Search Summary */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-blue-50">
                  <MapPin className="w-4 h-4 text-blue-700" />
                </span>
                <div className="text-left">
                  <p className="text-[11px] text-gray-500 font-medium leading-none">
                    From
                  </p>
                  <p className="text-sm font-semibold">{qFrom || "-"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-blue-50">
                  <MapPin className="w-4 h-4 text-blue-700" />
                </span>
                <div className="text-left">
                  <p className="text-[11px] text-gray-500 font-medium leading-none">
                    To
                  </p>
                  <p className="text-sm font-semibold">{qTo || "-"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-blue-50">
                  <Calendar className="w-4 h-4 text-blue-700" />
                </span>
                <div className="text-left">
                  <p className="text-[11px] text-gray-500 font-medium leading-none">
                    Travel Date
                  </p>
                  <p className="text-sm font-semibold">{formatDate(qDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Count */}
        {!loading && !err && matches.length > 0 && (
          <div className="mb-5 text-center">
            <p className="text-sm text-gray-600">
              Found{" "}
              <span className="font-semibold text-blue-700">
                {matches.length}
              </span>{" "}
              bus{matches.length !== 1 ? "es" : ""} matching your search
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <BusLoader
            message="Loading available buses..."
            subtext="Please wait while we find the best options for you"
            height="h-80" // optional
            className="mb-8" // optional
          />
        )}

        {/* Error (no technical messages exposed) */}
        {err && !loading && (
          <div className="max-w-2xl mx-auto rounded-xl p-6 border border-blue-100 bg-blue-50 text-center shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold mb-1">We couldn’t load buses</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please check your connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* No Results */}
        {!loading && !err && matches.length === 0 && (
          <div className="max-w-2xl mx-auto rounded-xl p-8 border border-gray-200 bg-white text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Buses Found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or check for alternative
              routes.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
              New Search
            </Link>
          </div>
        )}

        {/* Results — compact horizontal rows */}
        {!loading && !err && matches.length > 0 && (
          <div className="space-y-4">
            {matches.map((b) => (
              <BusCard key={b._id} bus={b} onBook={handleBook} qDate={qDate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact Horizontal Bus Card with Timetable shown via toast popup   */
/* ------------------------------------------------------------------ */
function BusCard({ bus, onBook, qDate }) {
  const {
    _id,
    busNo = "N/A",
    busName = "",
    type = "Standard",
    frequency = "Regular",
    price = 0,
    seats = 0,
    route = {},
    schedule = {},
    pickups = [],
  } = bus;

  const { from = "—", to = "—" } = route;
  const { departure = "—", arrival = "—", nextDayArrival = false } = schedule;

  const [opening, setOpening] = useState(false);
  const [availableSeats, setAvailableSeats] = useState(seats);
  const [loading, setLoading] = useState(true);

  // Fetch booking data to calculate available seats
  useEffect(() => {
    async function fetchAvailableSeats() {
      if (!_id || !qDate) {
        setAvailableSeats(seats);
        setLoading(false);
        return;
      }

      try {
        const data = await getBookingsByBusAndDate(_id, qDate);
        const bookedSeats = [
          ...(data?.bookedByGents || []),
          ...(data?.bookedByLadies || []),
        ];
        const unavailable = data?.unavailableSeats || [];
        const totalBooked = new Set([...bookedSeats, ...unavailable]).size;
        setAvailableSeats(Math.max(0, seats - totalBooked));
      } catch (err) {
        console.error("Failed to fetch available seats:", err);
        setAvailableSeats(seats);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailableSeats();
  }, [_id, qDate, seats]);

  const openTimetable = () => {
    if (!pickups?.length) {
      toast("No timetable available", { icon: "ℹ️" });
      return;
    }
    setOpening(true);
    showTimetableToast(pickups, () => setOpening(false));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.25 }}
      className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden"
    >
      {/* Row layout (no image as requested) */}
      <div className="flex flex-col md:flex-row items-stretch">
        {/* Left: Route + name */}
        <div className="flex-1 p-4 sm:p-5">
          {/* Route */}
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span>{from}</span>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{to}</span>
            <span className="ml-2 text-xs text-gray-500 font-medium">
              #{busNo}
            </span>
          </h3>

          {/* Bus name + type/frequency */}
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

          {/* Timeline row (compact) */}
          <div className="grid grid-cols-3 items-center gap-3">
            {/* Departure */}
            <div className="text-center rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Clock className="w-4 h-4 text-blue-700" />
                <p className="text-[10px] font-semibold text-gray-500 tracking-wide">
                  DEPARTURE
                </p>
              </div>
              <p className="text-base font-bold">{departure}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{qDate || "-"}</p>
            </div>

            {/* Duration (center) */}
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

            {/* Arrival */}
            <div className="text-center rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Clock className="w-4 h-4 text-blue-700" />
                <p className="text-[10px] font-semibold text-gray-500 tracking-wide">
                  ARRIVAL
                </p>
              </div>
              <p className="text-base font-bold">{arrival}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {nextDayArrival ? "Tomorrow" : "Today"}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Meta + actions */}
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
                <span className="font-semibold">{availableSeats}</span>
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
              onClick={() => onBook(_id)}
              disabled={availableSeats === 0}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-lg transition ${
                availableSeats === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-900 hover:bg-blue-800 text-white"
              }`}
            >
              <span>{availableSeats === 0 ? "No Seats" : "Book"}</span>
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
