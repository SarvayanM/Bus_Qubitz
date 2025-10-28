// src/pages/SelectedBusDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getBusesList } from "../../api/bus";
import { getBookingsByBusAndDate } from "../../api/booking";
import { fetchJourneys } from "../../api/journeys"; // <-- NEW: default/all journeys
import BusLoader from "../../components/bus/BusLoader";
import BusCard from "../../components/common/BusCard";
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

function tomorrowISO() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(0, 0, 0, 0);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
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

// ---- Normalization helpers (so BusCard always receives expected shape)
const firstDefined = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && v !== "");
const pickFrom = (obj, paths) => {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) {
        cur = cur[part];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && cur !== undefined && cur !== null && cur !== "") return cur;
  }
  return undefined;
};
function normalizeJourneyToBus(j) {
  const src = j?.bus ? { ...j, ...j.bus } : j || {};
  const _id = firstDefined(src._id, src.id, src.busId);
  const routeFrom = pickFrom(src, ["route.from", "from", "origin", "source"]);
  const routeTo = pickFrom(src, ["route.to", "to", "destination", "dest"]);
  const departure = pickFrom(src, [
    "schedule.departure",
    "departure",
    "departureTime",
    "deptTime",
    "time.departure",
  ]);
  const arrival = pickFrom(src, [
    "schedule.arrival",
    "arrival",
    "arrivalTime",
    "arrTime",
    "time.arrival",
  ]);
  const busNo = firstDefined(src.busNo, src.number, src.busNumber, src.code);
  const busName = firstDefined(src.busName, src.name, src.title, src.label);
  const type = firstDefined(
    src.type,
    src.busType,
    src.category,
    src.class,
    src.vehicleType
  );
  const frequency = firstDefined(
    src.frequency,
    src.serviceFrequency,
    src.operationFrequency,
    src.schedule?.frequency,
    src.freq
  );
  const price = Number(
    firstDefined(src.price, src.fare, src.minFare, src.startingPrice, 0)
  );
  const seatsTotal = Number(
    firstDefined(src.seatsTotal, src.totalSeats, src.capacity, src.seats, 0)
  );
  const seatsAvailable = firstDefined(
    src.seatsAvailable,
    src.availableSeats,
    src.vacantSeats
  );
  const pickups = firstDefined(src.pickups, src.stops, src.stopPoints, []);
  return {
    _id,
    busNo,
    busName,
    type: type || "",
    frequency: frequency || "Regular",
    price,
    seatsTotal,
    seatsAvailable,
    route: { from: routeFrom || "—", to: routeTo || "—" },
    schedule: { departure: departure || "—", arrival: arrival || "—" },
    pickups,
  };
}

// Timetable UI moved to shared component (showTimetableToast)

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
  const [date, setDate] = useState(qDate || "");

  // Form errors
  const [formError, setFormError] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [buses, setBuses] = useState([]);

  // ---- NEW: default (unfiltered) journeys state
  const [defState, setDefState] = useState({
    loading: false,
    error: "",
    items: [],
    total: 0,
  });
  const [defPage, setDefPage] = useState(1);
  const [defLimit] = useState(8);
  const hasFilters = !!(qFrom && qTo && qDate);

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
    setDate(dateParam.trim() || "");
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

  // NEW: load default journeys (no filters)
  useEffect(() => {
    if (hasFilters) return; // filtered mode uses your existing flow
    let mounted = true;
    (async () => {
      try {
        setDefState((s) => ({ ...s, loading: true, error: "" }));
        const data = await fetchJourneys({ page: defPage, limit: defLimit });
        if (!mounted) return;
        setDefState({
          loading: false,
          error: "",
          items: Array.isArray(data?.items) ? data.items : [],
          total: Number(data?.total || 0),
        });
      } catch (e) {
        if (!mounted) return;
        setDefState({
          loading: false,
          error: e?.response?.data?.message || e?.message || "Failed to load",
          items: [],
          total: 0,
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [hasFilters, defPage, defLimit]);

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

  // Clear filters in the form and URL
  const handleClear = () => {
    setFrom("");
    setTo("");
    setDate("");
    setFormError("");
    // Clear URL params — use setSearchParams so useEffect syncs qFrom/qTo/qDate
    setSearchParams({});
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

  // NEW: booking handler for default list (where date may be undefined)
  const handleDefaultBook = (busObj) => {
    const bus = normalizeJourneyToBus(busObj);
    // Decide whether booking should be for today or tomorrow based on departure
    const dep = bus?.schedule?.departure || bus?.departure || "";
    const depMin = parseTimeFlexible(dep);
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const canBookToday = depMin != null ? depMin - nowMin >= 60 : false;
    const dateToUse = qDate || (canBookToday ? todayISO() : tomorrowISO());

    navigate(
      `/busBookingDashboard?busId=${encodeURIComponent(
        bus._id
      )}&from=${encodeURIComponent(bus.route.from)}&to=${encodeURIComponent(
        bus.route.to
      )}&date=${encodeURIComponent(dateToUse)}`
    );
  };

  // NEW: totals for default pagination
  const defTotalPages = useMemo(
    () => Math.max(1, Math.ceil((defState.total || 0) / defLimit)),
    [defState.total, defLimit]
  );

  return (
    <div className="min-h-screen text-gray-900 py-10 pt-24">
      {/* Global Toaster moved to App root */}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          {/* Main Search Form */}
          <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Find Your Perfect Journey
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Search and book bus tickets across thousands of routes
            </p>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* From */}
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-900" />
                    From
                  </label>
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-12 rounded-lg border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow"
                  >
                    <option value="">Departure city</option>
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
                    <MapPin className="w-4 h-4 text-blue-900" />
                    To
                  </label>
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-12 rounded-lg border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow"
                  >
                    <option value="">Arrival city</option>
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
                    <Calendar className="w-4 h-4 text-blue-900" />
                    Date
                  </label>

                  <input
                    type="date"
                    value={date || ""}
                    min={todayISO()}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 rounded-lg border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow [color-scheme:light]"
                  />
                </div>

                {/* Submit / Clear */}
                <div className="flex md:justify-end pt-6">
                  <div className="w-full md:w-auto flex gap-3">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 border border-gray-300 text-slate-700 bg-white h-12 px-4 rounded-lg hover:shadow transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Clear
                    </button>

                    <button
                      type="submit"
                      className="flex-1 md:flex-initial bg-blue-900 hover:bg-blue-800 text-white font-semibold h-12 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
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
                      Search Buses
                    </button>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 animate-shake flex items-center gap-2">
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
          </div>

          <div className="border-t border-gray-200 pt-3">
            <p className="text-gray-600">
              Showing results for your selected route and date
            </p>
          </div>
        </div>

        {/* Count (filtered mode) */}
        {!loading && !err && hasFilters && matches.length > 0 && (
          <div className="mb-4 text-center">
            <p className="text-lg text-gray-700 font-medium">
              Found{" "}
              <span className="font-bold text-blue-900">{matches.length}</span>{" "}
              bus{matches.length !== 1 ? "es" : ""} matching your search
            </p>
          </div>
        )}

        {/* Loading (initial buses list) */}
        {loading && (
          <BusLoader
            message="Loading available buses..."
            subtext="Please wait while we find the best options for you"
            height="h-80"
            className="mb-8"
          />
        )}

        {/* Error (no technical messages exposed) */}
        {err && !loading && (
          <div className="max-w-2xl mx-auto rounded-xl p-8 border border-blue-200 bg-blue-50 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-blue-900" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              We couldn't load buses
            </h3>
            <p className="text-gray-600 mb-6">
              Please check your connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* No Results (filtered mode only) */}
        {!loading && !err && hasFilters && matches.length === 0 && (
          <div className="max-w-2xl mx-auto rounded-xl p-8 border border-gray-200 bg-white text-center shadow-lg">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              No Buses Found
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              Try adjusting your search criteria or check for alternative
              routes.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <ChevronLeft className="w-4 h-4" />
              New Search
            </Link>
          </div>
        )}

        {/* Results — filtered rows (existing behavior) */}
        {!loading && !err && hasFilters && matches.length > 0 && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {matches.map((b) => (
              <BusCard key={b._id} bus={b} onBook={handleBook} date={qDate} />
            ))}
          </div>
        )}

        {/* NEW: Default/all journeys when no filters are applied */}
        {!loading && !err && !hasFilters && (
          <div className="mx-auto max-w-7xl">
            {/* Optional header */}
            <div className="mb-4 text-center">
              <p className="text-lg text-gray-700 font-medium">
                Showing all journeys
              </p>
            </div>

            {/* Default list */}
            {defState.loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: defLimit }).map((_, i) => (
                  <BusLoader
                    key={i}
                    message={i === 0 ? "Loading journeys…" : ""}
                    subtext={i === 0 ? "Please wait a moment" : ""}
                    height="h-56"
                  />
                ))}
              </div>
            ) : defState.error ? (
              <div className="rounded-2xl border border-rose-200 bg-white p-6 text-rose-700 shadow text-center">
                {defState.error}
              </div>
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  <div className="space-y-6 max-w-6xl mx-auto">
                    {defState.items.map((raw, idx) => {
                      const bus = normalizeJourneyToBus(raw);
                      return (
                        <BusCard
                          key={bus._id || raw._id || raw.id || idx}
                          bus={bus}
                          date={undefined}
                          isFiltered={false}
                          onBook={() => handleDefaultBook(raw)}
                        />
                      );
                    })}
                  </div>
                </AnimatePresence>

                {/* Pagination */}
                {defState.items.length > 0 && (
                  <div className="mt-8 flex items-center justify-between gap-3 max-w-6xl mx-auto">
                    <div className="text-sm text-slate-600">
                      Page <span className="font-semibold">{defPage}</span> of{" "}
                      <span className="font-semibold">
                        {Math.max(1, defTotalPages)}
                      </span>{" "}
                      — <span className="font-semibold">{defState.total}</span>{" "}
                      results
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={defPage <= 1}
                        onClick={() => setDefPage((p) => Math.max(1, p - 1))}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold border transition ${
                          defPage <= 1
                            ? "text-slate-400 border-slate-200 cursor-not-allowed"
                            : "text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        Prev
                      </button>
                      <button
                        disabled={defPage >= defTotalPages}
                        onClick={() =>
                          setDefPage((p) => Math.min(defTotalPages, p + 1))
                        }
                        className={`rounded-lg px-3 py-2 text-sm font-semibold border transition ${
                          defPage >= defTotalPages
                            ? "text-slate-400 border-slate-200 cursor-not-allowed"
                            : "text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
