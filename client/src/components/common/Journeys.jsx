import React, { useEffect, useMemo, useState } from "react";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaSearch,
  FaBroom,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { fetchJourneys } from "../../api/journeys";
import { getBuses } from "../../api/bus";
import { useNavigate } from "react-router-dom";
import BusCard from "./BusCard";
import BusLoader from "../bus/BusLoader";

// -----------------------------
// Utilities
// -----------------------------

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

function todayISO() {
  const now = new Date();
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

// Get today's date in YYYY-MM-DD format for min= attr
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500";

// -----------------------------
// Field normalization helpers
// -----------------------------

const firstDefined = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && v !== "");

const pickFrom = (obj, paths) => {
  for (const p of paths) {
    // support nested "a.b.c"
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

/**
 * Normalize any journey/bus record into the exact shape BusCard expects.
 * Tries multiple common field names to avoid mismatches (type/frequency/etc).
 */
function normalizeJourneyToBus(j) {
  // support when the payload nests real bus under j.bus
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
    route: {
      from: routeFrom || "—",
      to: routeTo || "—",
    },
    schedule: {
      departure: departure || "—",
      arrival: arrival || "—",
    },
    pickups,
  };
}

// -----------------------------
// Component
// -----------------------------

export default function Journeys() {
  const navigate = useNavigate();

  // 1) Inputs the user is typing in (do NOT auto-apply)
  const [inputs, setInputs] = useState({ from: "", to: "", date: "" });

  // 2) Filters actually applied to the query (only set when Search clicked)
  const [applied, setApplied] = useState({ from: "", to: "", date: "" });

  // 3) Available locations extracted from all buses
  const [locations, setLocations] = useState([]);
  const [allBusesData, setAllBusesData] = useState([]);

  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  const [state, setState] = useState({
    loading: true,
    error: "",
    items: [],
    total: 0,
  });

  const [validationErrors, setValidationErrors] = useState({
    from: "",
    to: "",
    date: "",
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((state.total || 0) / limit)),
    [state.total, limit]
  );

  // Extract unique locations from buses on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const buses = await getBuses();
        setAllBusesData(buses);

        const locationsSet = new Set();
        buses.forEach((bus) => {
          if (bus?.route?.from) locationsSet.add(bus.route.from);
          if (bus?.route?.to) locationsSet.add(bus.route.to);
        });

        const sortedLocations = Array.from(locationsSet).sort();
        setLocations(sortedLocations);
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      }
    };

    fetchLocations();
  }, []);

  const setInput = (field) => (e) => {
    setInputs((s) => ({ ...s, [field]: e.target.value }));
  };

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const params = {
        from: applied.from ? String(applied.from).trim() : undefined,
        to: applied.to ? String(applied.to).trim() : undefined,
        page,
        limit,
      };
      if (applied.date) params.date = applied.date;

      Object.keys(params).forEach((k) => {
        if (params[k] === undefined || params[k] === "") delete params[k];
      });

      const data = await fetchJourneys(params);
      setState({
        loading: false,
        error: "",
        items: data?.items || [],
        total: data?.total || 0,
      });
    } catch (e) {
      setState({
        loading: false,
        error: e?.response?.data?.message || e?.message || "Failed to load",
        items: [],
        total: 0,
      });
    }
  };

  // Initial load (no filters) + when applied filters or page change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied.from, applied.to, applied.date, page]);

  const onSearch = () => {
    setValidationErrors({});
    const errors = {};

    if (!inputs.from || !inputs.from.trim()) {
      errors.from = "Please select a departure location";
    }
    if (!inputs.to || !inputs.to.trim()) {
      errors.to = "Please select a destination location";
    }
    if (
      inputs.from &&
      inputs.to &&
      inputs.from.trim() &&
      inputs.to.trim() &&
      inputs.from.trim() === inputs.to.trim()
    ) {
      errors.to = "Destination must be different from departure";
    }
    if (!inputs.date) {
      errors.date = "Please select a date";
    } else {
      const selectedDate = new Date(inputs.date);
      const today = new Date(getTodayDate());
      if (selectedDate < today) {
        errors.date = "Cannot select past dates";
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors before searching");
      return;
    }

    setPage(1);
    setApplied({
      from: inputs.from.trim(),
      to: inputs.to.trim(),
      date: inputs.date,
    });
  };

  // Helper: determine whether booking should be for today or tomorrow
  const bookLabelAndDateForBus = (rawBus) => {
    const bus = normalizeJourneyToBus(rawBus);
    const dep = bus?.schedule?.departure;
    const depMinutes = parseTimeFlexible(dep);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (depMinutes == null)
      return { label: "Book for Tomorrow", date: tomorrowISO() };
    if (depMinutes - nowMinutes >= 60) {
      return { label: "Book for Today", date: todayISO() };
    }
    return { label: "Book for Tomorrow", date: tomorrowISO() };
  };

  const isFilterApplied = Boolean(
    applied?.from && applied?.to && applied?.date
  );

  const getCardButtonLabel = (rawBus) => {
    if (isFilterApplied) return "Book Now";
    return bookLabelAndDateForBus(rawBus).label;
  };

  const onClear = () => {
    setInputs({ from: "", to: "", date: "" });
    setValidationErrors({});
    setPage(1);
    setApplied({ from: "", to: "", date: "" });
  };

  return (
    <div className="min-h-screen">
      {/* Header + Filters */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 via-indigo-50 to-white" />
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-8">
          <div className="mb-6">
            <motion.h1
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 18 }}
              className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900"
            >
              Find Your Journey
            </motion.h1>
            <p className="mt-2 text-slate-600">
              Showing <span className="font-semibold">all buses</span> by
              default. Enter <span className="font-semibold">From</span>,{" "}
              <span className="font-semibold">To</span>, or{" "}
              <span className="font-semibold">Date</span> and press{" "}
              <span className="font-semibold">Search</span> to filter.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl p-4 md:p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative md:col-span-1">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                <select
                  className={`${inputCls} pl-10 ${
                    validationErrors.from ? "border-red-500" : ""
                  }`}
                  value={inputs.from}
                  onChange={setInput("from")}
                >
                  <option value="">Select From Location</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                {validationErrors.from && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.from}
                  </p>
                )}
              </div>

              <div className="relative md:col-span-1">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                <select
                  className={`${inputCls} pl-10 ${
                    validationErrors.to ? "border-red-500" : ""
                  }`}
                  value={inputs.to}
                  onChange={setInput("to")}
                >
                  <option value="">Select To Location</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                {validationErrors.to && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.to}
                  </p>
                )}
              </div>

              <div className="relative md:col-span-1">
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                <input
                  type="date"
                  min={getTodayDate()}
                  className={`${inputCls} pl-10 ${
                    validationErrors.date ? "border-red-500" : ""
                  }`}
                  value={inputs.date}
                  onChange={setInput("date")}
                />
                {validationErrors.date && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.date}
                  </p>
                )}
              </div>

              <button
                onClick={onSearch}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow hover:bg-blue-700 active:scale-[0.99] transition"
                title="Search"
              >
                <FaSearch />
                Search
              </button>

              <button
                onClick={onClear}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
                title="Clear filters"
              >
                <FaBroom />
                Clear
              </button>
            </div>

            {(applied.from || applied.to || applied.date) && (
              <div className="mt-3 text-sm text-slate-600">
                Applied:
                {applied.from && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    From: {applied.from}
                  </span>
                )}
                {applied.to && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    To: {applied.to}
                  </span>
                )}
                {applied.date && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Date: {applied.date}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        {state.loading && (
          <BusLoader
            message="Loading journeys..."
            subtext="Finding the best trips for you"
            height="h-64"
            className="mx-auto max-w-7xl"
          />
        )}

        {!state.loading && state.error && (
          <div className="rounded-2xl border border-rose-200 bg-white p-6 text-rose-700 shadow">
            {state.error}
          </div>
        )}

        {!state.loading && !state.error && (
          <>
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {state.items.map((raw, idx) => {
                  const bus = normalizeJourneyToBus(raw); // <-- ensure BusCard gets exactly what it expects
                  return (
                    <BusCard
                      key={bus._id || raw._id || raw.id || idx}
                      bus={bus}
                      date={isFilterApplied ? applied.date : undefined}
                      isFiltered={isFilterApplied}
                      onBook={(busId, dateFromCard) => {
                        const from = (bus?.route?.from || "").trim();
                        const to = (bus?.route?.to || "").trim();
                        const qdate =
                          dateFromCard ||
                          (isFilterApplied
                            ? applied.date
                            : bookLabelAndDateForBus(raw).date);
                        navigate(
                          `/busBookingDashboard?busId=${encodeURIComponent(
                            busId
                          )}&from=${encodeURIComponent(
                            from
                          )}&to=${encodeURIComponent(
                            to
                          )}&date=${encodeURIComponent(qdate)}`
                        );
                      }}
                    />
                  );
                })}
              </div>
            </AnimatePresence>

            {state.items.length === 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow">
                <div className="font-semibold mb-2">
                  No buses match your criteria.
                </div>
                <div className="text-sm">
                  Try different filters. Current filters:
                  <div className="mt-2">
                    {applied.from && (
                      <span className="mr-2">From: {applied.from}</span>
                    )}
                    {applied.to && (
                      <span className="mr-2">To: {applied.to}</span>
                    )}
                    {applied.date && (
                      <span className="mr-2">Date: {applied.date}</span>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Tip: If you set a date, only buses operating on that weekday
                    or on specific operating dates will be shown.
                  </div>
                </div>
              </div>
            )}

            {state.items.length > 0 && (
              <div className="mt-8 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Page <span className="font-semibold">{page}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span> —{" "}
                  <span className="font-semibold">{state.total}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold border transition ${
                      page <= 1
                        ? "text-slate-400 border-slate-200 cursor-not-allowed"
                        : "text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold border transition ${
                      page >= totalPages
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
    </div>
  );
}
