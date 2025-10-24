import React, { useEffect, useMemo, useState } from "react";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBus,
  FaClock,
  FaChair,
  FaSearch,
  FaArrowRight,
  FaTicketAlt,
  FaBroom,
  FaBuilding,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { fetchJourneys } from "../../api/journeys";
import { getBuses } from "../../api/bus";
import { useNavigate } from "react-router-dom";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500";

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Journeys() {
  const navigate = useNavigate();

  // 1) Inputs the user is typing in (do NOT auto-apply)
  const [inputs, setInputs] = useState({
    from: "",
    to: "",
    date: "",
  });

  // 2) Filters actually applied to the query (only set when Search clicked)
  const [applied, setApplied] = useState({
    from: "",
    to: "",
    date: "",
  });

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
      // Only send date if user has selected it
      const params = {
        from: applied.from,
        to: applied.to,
        page,
        limit,
      };
      if (applied.date) params.date = applied.date;
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

    // Validate From location
    if (!inputs.from.trim()) {
      errors.from = "Please select a departure location";
    }

    // Validate To location
    if (!inputs.to.trim()) {
      errors.to = "Please select a destination location";
    }

    // Check if From and To are different
    if (inputs.from.trim() && inputs.to.trim() && inputs.from === inputs.to) {
      errors.to = "Destination must be different from departure";
    }

    // Date is required for filtering
    if (!inputs.date) {
      errors.date = "Please select a date";
    } else {
      // Validate Date (must be today or future)
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

  const onClear = () => {
    setInputs({ from: "", to: "", date: "" });
    setValidationErrors({});
    setPage(1);
    setApplied({ from: "", to: "", date: "" }); // show ALL again (no date filter)
  };

  const onBook = (bus) => {
    const params = new URLSearchParams();
    if (applied.date) params.set("date", applied.date);
    navigate(`/book/${bus._id}?${params.toString()}`);
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

            {/* Applied pill line */}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-2xl border border-slate-200 bg-white shadow animate-pulse"
              />
            ))}
          </div>
        )}
        {!state.loading && state.error && (
          <div className="rounded-2xl border border-rose-200 bg-white p-6 text-rose-700 shadow">
            {state.error}
          </div>
        )}

        {!state.loading && !state.error && (
          <>
            <AnimatePresence mode="popLayout">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {state.items.map((bus) => (
                  <motion.div
                    key={bus._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="group rounded-2xl border border-slate-200 bg-white shadow hover:shadow-lg transition overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <FaBus />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-slate-900">
                            {bus?.busName || bus?.operatorName || "Bus"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {bus?.plateNo || bus?.busNo || ""}
                          </div>
                        </div>
                      </div>

                      {/* Company Information */}
                      {bus?.companyName && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5">
                          <FaBuilding className="text-slate-400" />
                          <span className="truncate">{bus.companyName}</span>
                        </div>
                      )}

                      <div className="mt-3 text-sm text-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className="text-slate-400" />
                            <span className="font-medium">
                              {bus?.route?.from || bus?.from || "—"}
                            </span>
                          </div>
                          <FaArrowRight className="text-slate-300" />
                          <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className="text-slate-400" />
                            <span className="font-medium">
                              {bus?.route?.to || bus?.to || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <FaClock className="text-slate-400" />
                          <span>
                            {bus?.schedule?.departure ||
                              bus?.departureTime ||
                              "—"}
                            {bus?.schedule?.arrival
                              ? ` · Arr ${bus.schedule.arrival}`
                              : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <FaChair className="text-slate-400" />
                          <span>
                            {typeof bus?.seatsAvailable === "number" &&
                            typeof bus?.seatsTotal === "number"
                              ? `${bus.seatsAvailable}/${bus.seatsTotal} seats available`
                              : typeof bus?.seatsAvailable === "number"
                              ? `${bus.seatsAvailable} seats available`
                              : `${bus?.seatsTotal ?? "—"} total seats`}
                          </span>
                        </div>

                        {bus?.fare ? (
                          <div className="text-slate-900 font-semibold">
                            Rs. {Number(bus.fare).toFixed(2)}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 p-4">
                      <button
                        onClick={() => onBook(bus)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99] transition group"
                        title="Book this bus"
                      >
                        <FaTicketAlt className="text-white/90" />
                        <span>Book</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>

            {state.items.length === 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow">
                No buses match your criteria. Try different filters.
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
