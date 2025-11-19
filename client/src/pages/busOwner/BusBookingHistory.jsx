// src/pages/busOwner/BusBookingHistory.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchCompanyProfile,
  fetchCompanyBookings,
  fetchCompanyBuses,
  fetchCompanyCancelledBookings,
} from "../../api/company";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import BusLoader from "../../components/bus/BusLoader";

// ----- pdfMake font setup (run once at module load) -----
try {
  const vfs = (pdfFonts && (pdfFonts.pdfMake?.vfs || pdfFonts.vfs)) || null;
  if (vfs) pdfMake.vfs = vfs;
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn("pdfMake vfs not available:", e?.message || e);
}

// Helper: get today's date as YYYY-MM-DD
function getTodayYMD() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: normalize any date-ish value to YYYY-MM-DD or null
function normalizeToYMD(value) {
  if (!value) return null;

  // If already "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  // Adjust to local date (remove timezone effect)
  const tzOffset = d.getTimezoneOffset();
  if (tzOffset !== 0) {
    d.setMinutes(d.getMinutes() - tzOffset);
  }

  return d.toISOString().slice(0, 10);
}

export default function BusBookingHistory() {
  const [company, setCompany] = useState(null);
  const [activeBookings, setActiveBookings] = useState([]);
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [allBuses, setAllBuses] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Frontend filters
  const [selectedBusId, setSelectedBusId] = useState("all");
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Confirmed" | "Cancelled"

  const [dateFilter, setDateFilter] = useState(getTodayYMD); // default today
  const [dateRangeFrom, setDateRangeFrom] = useState("");
  const [dateRangeTo, setDateRangeTo] = useState("");
  const [rangeError, setRangeError] = useState("");

  // ---- Load data once, no backend date filters ----
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [companyRes, activeRes, cancelledRes, busesRes] =
          await Promise.all([
            fetchCompanyProfile(),
            fetchCompanyBookings(), // ALL active bookings for the company
            fetchCompanyCancelledBookings(), // ALL cancelled bookings
            fetchCompanyBuses(),
          ]);

        setCompany(companyRes || null);

        // Normalize dates once here
        const normalizedActive = (activeRes || []).map((b) => ({
          ...b,
          kind: "active",
          status: b.status || "Confirmed",
          travelDate: normalizeToYMD(b.travelDate),
        }));

        const normalizedCancelled = (cancelledRes || []).map((b) => ({
          ...b,
          kind: "cancelled",
          status: "Cancelled",
          travelDate: normalizeToYMD(b.travelDate),
        }));

        setActiveBookings(normalizedActive);
        setCancelledBookings(normalizedCancelled);
        setAllBuses(busesRes || []);
      } catch (err) {
        console.error("BookingsInRange load error:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load bookings for this company."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ---- Custom range validation ----
  const validateRange = (from, to) => {
    if (from && to && from > to) {
      setRangeError("From date cannot be after To date.");
    } else {
      setRangeError("");
    }
  };

  const handleFromChange = (value) => {
    const norm = value || "";
    setDateRangeFrom(norm);
    if (norm) {
      setDateFilter("");
    }
    validateRange(norm, dateRangeTo);
  };

  const handleToChange = (value) => {
    const norm = value || "";
    setDateRangeTo(norm);
    if (norm) {
      setDateFilter("");
    }
    validateRange(dateRangeFrom, norm);
  };

  // Shift single-day Travel Date by +/- days
  const shiftDateFilter = (days) => {
    const baseStr = dateFilter || getTodayYMD();
    const d = new Date(baseStr);
    if (Number.isNaN(d.getTime())) return;
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const newStr = `${y}-${m}-${day}`;
    setDateFilter(newStr);
    setDateRangeFrom("");
    setDateRangeTo("");
    setRangeError("");
  };

  const openBookingModal = (booking) => setSelectedBooking(booking);
  const closeBookingModal = () => setSelectedBooking(null);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <BusLoader
          message="Loading bookings..."
          subtext="Fetching company bookings"
          height="h-56"
          className="max-w-lg"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <BusLoader
          message="Error loading bookings"
          subtext={
            error ||
            "Make sure you are logged in and the companyId cookie is set."
          }
          height="h-56"
          className="max-w-lg"
        />
      </div>
    );
  }

  // ---------- Bus & route options ----------
  const busOptions = [
    { value: "all", label: "All Buses" },
    ...allBuses.map((b) => ({ value: b._id, label: b.busName })),
  ];

  const routeSet = new Set();
  allBuses.forEach((b) => {
    if (b.route?.from && b.route?.to) {
      routeSet.add(`${b.route.from} → ${b.route.to}`);
    }
  });
  const routeOptions = [
    { value: "all", label: "All Routes" },
    ...Array.from(routeSet).map((r) => ({ value: r, label: r })),
  ];

  // ---------- Merge lists based on statusFilter ----------
  let mergedList;
  if (statusFilter === "Confirmed") {
    mergedList = activeBookings;
  } else if (statusFilter === "Cancelled") {
    mergedList = cancelledBookings;
  } else {
    mergedList = [...activeBookings, ...cancelledBookings];
  }

  // ---------- Apply frontend filters ----------
  const filteredBookings = mergedList.filter((b) => {
    const bus = b.bus || b.busId || {};
    const busIdStr = bus?._id?.toString?.() || "";

    if (selectedBusId !== "all" && busIdStr !== selectedBusId) return false;

    if (selectedRoute !== "all") {
      const routeLabel = bus.route ? `${bus.route.from} → ${bus.route.to}` : "";
      if (routeLabel !== selectedRoute) return false;
    }

    if (statusFilter !== "All" && b.status !== statusFilter) return false;

    const tDate = b.travelDate;
    if (!tDate) return false;

    if (rangeError && dateRangeFrom && dateRangeTo) {
      return false;
    }

    if (dateRangeFrom && dateRangeTo && !rangeError) {
      if (tDate < dateRangeFrom || tDate > dateRangeTo) return false;
      return true;
    }

    if (dateFilter) {
      if (tDate !== dateFilter) return false;
    }

    return true;
  });

  // ---------- Labels ----------
  const currentBusLabel =
    selectedBusId === "all"
      ? "All Buses"
      : busOptions.find((o) => o.value === selectedBusId)?.label ||
        "Selected Bus";

  const currentRouteLabel =
    selectedRoute === "all" ? "All Routes" : selectedRoute;

  const currentStatusLabel =
    statusFilter === "All" ? "All Bookings" : statusFilter;

  let currentDateLabel;
  if (dateRangeFrom && dateRangeTo && !rangeError) {
    currentDateLabel = `${dateRangeFrom} → ${dateRangeTo}`;
  } else if (dateFilter) {
    currentDateLabel = dateFilter;
  } else if (rangeError && dateRangeFrom && dateRangeTo) {
    currentDateLabel = "Invalid range";
  } else {
    currentDateLabel = "All Dates";
  }

  // ---------- Export PDF (current view) ----------
  const handleExportReport = () => {
    if (!filteredBookings.length) {
      alert("No bookings to export for the selected filters.");
      return;
    }

    let totalRevenue = 0;
    let totalBookings = filteredBookings.length;
    let totalCancelled = 0;
    let totalConfirmed = 0;

    const tableBody = [];

    tableBody.push([
      { text: "Bus", style: "tableHeader" },
      { text: "Bus No", style: "tableHeader" },
      { text: "Passenger", style: "tableHeader" },
      { text: "Contact", style: "tableHeader" },
      { text: "Travel Date", style: "tableHeader" },
      { text: "Route", style: "tableHeader" },
      { text: "Seats (No + Gender)", style: "tableHeader" },
      { text: "Total", style: "tableHeader" },
      { text: "Status", style: "tableHeader" },
    ]);

    filteredBookings.forEach((b) => {
      const passengerName = `${b.passenger?.fname || ""} ${
        b.passenger?.lname || ""
      }`.trim();
      const contact = b.passenger?.contactNo || b.passenger?.phone || "";
      const bookedAt = b.createdAt
        ? new Date(b.createdAt).toLocaleString()
        : "";

      const bus = b.bus || b.busId || {};
      const busName = bus.busName || "-";
      const busNo = bus.busNo || "";
      const routeLabel = bus.route
        ? `${bus.route.from} → ${bus.route.to}`
        : "-";

      const seats = b.seats || [];
      const seatDisplay = seats
        .map((s) => {
          const g =
            s.gender === "Male"
              ? "M"
              : s.gender === "Female"
              ? "F"
              : s.gender === "Other"
              ? "O"
              : "";
          return g ? `${s.number}(${g})` : `${s.number}`;
        })
        .join(", ");

      const seatCount = seats.length || 0;
      const pricePerSeat = bus.price != null ? Number(bus.price) : null;
      const totalAmount =
        pricePerSeat != null ? pricePerSeat * seatCount : null;

      const pricePerSeatStr =
        pricePerSeat != null ? `LKR ${pricePerSeat.toLocaleString()}` : "-";
      const totalStr =
        totalAmount != null ? `LKR ${totalAmount.toLocaleString()}` : "-";

      const isCancelled = b.status === "Cancelled";
      const cancelReason = b.cancelReason || "";
      const cancelledAt = b.cancelledAt
        ? new Date(b.cancelledAt).toLocaleString()
        : "";

      if (b.status === "Cancelled") totalCancelled += 1;
      if (b.status === "Confirmed") totalConfirmed += 1;
      if (totalAmount != null && !Number.isNaN(totalAmount)) {
        totalRevenue += totalAmount;
      }

      tableBody.push([
        { text: busName, style: "tableCell" },
        { text: busNo, style: "tableCell" },
        { text: passengerName || "-", style: "tableCell" },
        { text: contact || "-", style: "tableCell" },
        { text: b.travelDate || "-", style: "tableCell" },
        { text: routeLabel, style: "tableCell" },
        { text: seatDisplay || "-", style: "tableCell" },
        { text: totalStr, style: "tableCell" },
        {
          text: b.status || "-",
          style: "statusCell",
          color: isCancelled ? "#b91c1c" : "#047857",
        },
      ]);

      const detailLines = [];
      detailLines.push(
        `Booked At: ${bookedAt || "-"}    Payment: ${b.payment || "-"}`
      );
      detailLines.push(`Pickup: ${b.pickup || "-"}    Drop: ${b.drop || "-"}`);
      detailLines.push(
        `Seat Count: ${seatCount}    Price/Seat: ${pricePerSeatStr}`
      );
      if (isCancelled && (cancelReason || cancelledAt)) {
        detailLines.push(
          `Cancellation Reason: ${cancelReason || "-"}    Cancelled At: ${
            cancelledAt || "-"
          }`
        );
      }

      tableBody.push([
        {
          text: detailLines.join("\n"),
          colSpan: 9,
          style: "detailRow",
        },
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
      ]);
    });

    const docDefinition = {
      info: {
        title: `Bookings Report - ${currentDateLabel}`,
      },
      pageMargins: [20, 20, 20, 24],
      content: [
        {
          text: `${company?.companyName || "Company"} – Bookings Report`,
          style: "header",
        },
        {
          margin: [0, 6, 0, 2],
          columns: [
            {
              width: "50%",
              stack: [
                {
                  text: `Bus Filter: ${currentBusLabel}`,
                  style: "filterText",
                },
                {
                  text: `Route Filter: ${currentRouteLabel}`,
                  style: "filterText",
                },
              ],
            },
            {
              width: "50%",
              stack: [
                {
                  text: `Status Filter: ${currentStatusLabel}`,
                  style: "filterText",
                },
                {
                  text: `Date Filter: ${currentDateLabel}`,
                  style: "filterText",
                },
              ],
            },
          ],
        },
        {
          text: `Total bookings in view: ${totalBookings}`,
          margin: [0, 0, 0, 8],
          style: "small",
        },
        {
          table: {
            headerRows: 1,
            widths: [
              "auto",
              "auto",
              "*",
              "auto",
              "auto",
              "*",
              "*",
              "auto",
              "auto",
            ],
            body: tableBody,
          },
          layout: {
            fillColor: function (rowIndex) {
              if (rowIndex === 0) return "#0f172a"; // header
              if (rowIndex % 2 === 0) return "#f8fafc";
              return null;
            },
            hLineColor: "#e2e8f0",
            vLineColor: "#e2e8f0",
          },
        },
        {
          margin: [0, 8, 0, 0],
          table: {
            widths: ["*", "auto", "auto", "auto", "auto"],
            body: [
              [
                { text: "Summary", style: "summaryLabel" },
                {
                  text: `Total: ${totalBookings}`,
                  style: "summaryValue",
                },
                {
                  text: `Confirmed: ${totalConfirmed}`,
                  style: "summaryValue",
                },
                {
                  text: `Cancelled: ${totalCancelled}`,
                  style: "summaryValue",
                },
                {
                  text: `Revenue: LKR ${totalRevenue.toLocaleString()}`,
                  style: "summaryValue",
                },
              ],
            ],
          },
          layout: "noBorders",
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          color: "#0f172a",
          margin: [0, 0, 0, 6],
        },
        filterText: {
          fontSize: 9,
          color: "#4b5563",
        },
        small: {
          fontSize: 9,
          color: "#6b7280",
        },
        tableHeader: {
          fontSize: 9,
          bold: true,
          color: "#ffffff",
          alignment: "left",
        },
        tableCell: {
          fontSize: 8,
          color: "#111827",
        },
        statusCell: {
          fontSize: 8,
          bold: true,
        },
        detailRow: {
          fontSize: 8,
          color: "#4b5563",
          margin: [2, 1, 2, 4],
        },
        summaryLabel: {
          fontSize: 10,
          bold: true,
          color: "#0f172a",
        },
        summaryValue: {
          fontSize: 9,
          color: "#111827",
        },
      },
      defaultStyle: {
        fontSize: 9,
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`bookings_report_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-md border-b border-slate-200/70 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 mt-14">
          {/* Centered Company Name */}
          <div className="w-full flex flex-col items-center justify-center text-center gap-1 in-view animate-fly-in-from-top">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900 tracking-tight">
             {company?.companyName || "Company"} Booking History
            </h1>

            <p className="mt-1 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
              Review, filter, and export booking history across your fleet
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-8xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Bookings Table + Filters */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6"
        >
          {/* Wrapper */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-5">
            {/* Centered Heading */}
            <div className="w-full text-center">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                Booking Overview
              </h2>
            </div>

            {/* Second row: Left (details) + Right (count + export) */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
              {/* Left Side: Bus / Route / Status / Date */}
              <div className="md:text-left">
                <p className="text-xs sm:text-sm text-slate-600">
                  Bus:{" "}
                  <span className="font-medium text-blue-900">
                    {currentBusLabel}
                  </span>{" "}
                  • Route:{" "}
                  <span className="font-medium text-blue-900">
                    {currentRouteLabel}
                  </span>{" "}
                  • Status:{" "}
                  <span className="font-medium text-blue-900">
                    {currentStatusLabel}
                  </span>{" "}
                  • Date:{" "}
                  <span className="font-medium text-blue-900">
                    {currentDateLabel}
                  </span>
                </p>

                {rangeError && (
                  <p className="text-xs sm:text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                    {rangeError}
                  </p>
                )}
              </div>

              {/* Right Side: Count + Export */}
              <div className="flex items-center justify-center md:justify-end gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {filteredBookings.length} booking
                  {filteredBookings.length === 1 ? "" : "s"}
                </span>
                <button
                  onClick={handleExportReport}
                  className="px-3 sm:px-4 py-2 rounded-lg bg-blue-900 text-white text-xs sm:text-sm font-medium hover:bg-blue-800 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 place-items-start mb-4 sm:mb-6">
            {/* Bus filter */}
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs sm:text-sm font-medium text-slate-700">
                Bus
              </label>
              <select
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
              >
                {busOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Route filter */}
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs sm:text-sm font-medium text-slate-700">
                Route
              </label>
              <select
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                {routeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs sm:text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Bookings</option>
                <option value="Confirmed">Confirmed Only</option>
                <option value="Cancelled">Cancelled Only</option>
              </select>
            </div>

            {/* Travel Date (single day) */}
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs sm:text-sm font-medium text-slate-700">
                Travel Date (Day)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs hover:bg-slate-50"
                  onClick={() => shiftDateFilter(-1)}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                <input
                  type="date"
                  className="flex-1 min-w-0 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setDateRangeFrom("");
                    setDateRangeTo("");
                    setRangeError("");
                  }}
                />

                <button
                  type="button"
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs hover:bg-slate-50"
                  onClick={() => shiftDateFilter(1)}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Custom Range */}
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs sm:text-sm font-medium text-slate-700">
                Custom Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="flex-1 min-w-0 border border-slate-300 rounded-xl px-2 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dateRangeFrom}
                  onChange={(e) => handleFromChange(e.target.value)}
                />
                <span className="text-xs text-slate-500">to</span>
                <input
                  type="date"
                  className="flex-1 min-w-0 border border-slate-300 rounded-xl px-2 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dateRangeTo}
                  onChange={(e) => handleToChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    "Bus",
                    "Passenger",
                    "Contact",
                    "Travel Date",
                    "Route",
                    "Seats (No + Gender)",
                    "Total",
                    "Status / Cancellation",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className={`py-2.5 px-3 sm:px-4 text-left font-semibold text-slate-700 ${
                        header === "Actions" ? "text-right" : ""
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b, index) => {
                  const seats = b.seats || [];
                  const seatDisplay = seats
                    .map((s) => {
                      const g =
                        s.gender === "Male"
                          ? "M"
                          : s.gender === "Female"
                          ? "F"
                          : s.gender === "Other"
                          ? "O"
                          : "";
                      return g ? `${s.number}(${g})` : `${s.number}`;
                    })
                    .join(", ");

                  const seatCount = seats.length || 0;

                  const bookedAt = b.createdAt
                    ? new Date(b.createdAt).toLocaleString()
                    : "-";

                  const isCancelled = b.status === "Cancelled";
                  const cancelReason = b.cancelReason || null;
                  const cancelledAt = b.cancelledAt
                    ? new Date(b.cancelledAt).toLocaleString()
                    : null;

                  const bus = b.bus || b.busId || {};
                  const busName = bus.busName || "-";
                  const busNo = bus.busNo || "";
                  const routeLabel = bus.route
                    ? `${bus.route.from} → ${bus.route.to}`
                    : "-";

                  const pricePerSeat =
                    bus.price != null ? Number(bus.price) : null;
                  const totalAmount =
                    pricePerSeat != null ? pricePerSeat * seatCount : null;
                  const totalStr =
                    totalAmount != null
                      ? `LKR ${totalAmount.toLocaleString()}`
                      : "-";

                  return (
                    <motion.tr
                      key={b._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: index * 0.01 }}
                      className={`transition-colors duration-150 hover:bg-blue-50 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                      }`}
                    >
                      {/* Bus + Bus No */}
                      <td className="py-2.5 px-3 sm:px-4 align-top">
                        <div className="font-medium text-slate-800">
                          {busName}
                        </div>
                        {busNo && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {busNo}
                          </div>
                        )}
                      </td>

                      {/* Passenger */}
                      <td className="py-2.5 px-3 sm:px-4 align-top">
                        <div className="text-slate-800 font-medium">
                          {b.passenger?.fname} {b.passenger?.lname}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-2.5 px-3 sm:px-4 text-slate-700 align-top">
                        {b.passenger?.contactNo || b.passenger?.phone || "-"}
                      </td>

                      {/* Travel Date */}
                      <td className="py-2.5 px-3 sm:px-4 text-slate-700 align-top">
                        {b.travelDate || "-"}
                      </td>

                      {/* Route */}
                      <td className="py-2.5 px-3 sm:px-4 text-slate-700 align-top">
                        {routeLabel}
                      </td>

                      {/* Seats (No + Gender) */}
                      <td className="py-2.5 px-3 sm:px-4 align-top">
                        {seatDisplay ? (
                          <div>
                            <span className="text-slate-800">
                              {seatDisplay}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1.5">
                              ({seatCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 sm:px-4 font-semibold text-slate-800 align-top">
                        {totalStr}
                      </td>

                      {/* Status + cancellation metadata */}
                      <td className="py-2.5 px-3 sm:px-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit transition-colors duration-150 ${
                              b.status === "Confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : b.status === "Cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {b.status}
                          </span>
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>Booked: {bookedAt}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
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
                              <span>
                                Pickup: {b.pickup || "-"} • Drop:{" "}
                                {b.drop || "-"}
                              </span>
                            </div>
                            {isCancelled && (cancelReason || cancelledAt) && (
                              <div className="bg-red-50 p-2 rounded-lg border border-red-100 mt-1">
                                {cancelReason && (
                                  <div className="flex items-start gap-1">
                                    <svg
                                      className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                      />
                                    </svg>
                                    <span className="text-red-700">
                                      Reason: {cancelReason}
                                    </span>
                                  </div>
                                )}
                                {cancelledAt && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <svg
                                      className="w-3 h-3 text-red-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span className="text-red-700">
                                      Cancelled: {cancelledAt}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 sm:px-4 text-right align-top">
                        <button
                          onClick={() => openBookingModal(b)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-all duration-150 cursor-pointer"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10 sm:py-12">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <svg
                          className="w-12 h-12 mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <p className="text-sm sm:text-base font-medium text-slate-500 mb-1">
                          No bookings found
                        </p>
                        <p className="text-xs sm:text-sm text-slate-400">
                          Try adjusting your filters to see more results.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </main>

      {/* Booking Modal with fly-in / fly-out */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingModal booking={selectedBooking} onClose={closeBookingModal} />
        )}
      </AnimatePresence>
    </div>
  );
}

// -------- Booking Modal (with close button + animations) --------

function BookingModal({ booking, onClose }) {
  const seats = booking.seats || [];
  const seatDisplay = seats
    .map((s) => {
      const g =
        s.gender === "Male"
          ? "M"
          : s.gender === "Female"
          ? "F"
          : s.gender === "Other"
          ? "O"
          : "";
      return g ? `${s.number}(${g})` : `${s.number}`;
    })
    .join(", ");

  const seatCount = seats.length || 0;

  const bus = booking.bus || booking.busId || {};
  const pricePerSeat = bus.price != null ? Number(bus.price) : 0;
  const baseAmount = pricePerSeat * seatCount;

  const bookedAt = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString()
    : "-";

  const isCancelled = booking.status === "Cancelled";
  const cancelReason = booking.cancelReason || null;
  const cancelledAt = booking.cancelledAt
    ? new Date(booking.cancelledAt).toLocaleString()
    : null;

  const routeLabel = bus.route ? `${bus.route.from} → ${bus.route.to}` : "-";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22 }}
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-2 p-4 sm:p-5 relative max-h-[80vh] overflow-y-auto"
      >
        {/* Icon close (top-right) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors duration-150 cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-full p-1.5"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-4 sm:mb-5">
          Booking Details
        </h3>

        <div className="space-y-4 sm:space-y-5">
          {/* Passenger block */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
              <svg
                className="w-5 h-5 text-blue-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Passenger Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-slate-600">Name</span>
                <p className="font-medium text-slate-800">
                  {booking.passenger?.fname} {booking.passenger?.lname}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Contact</span>
                <p className="font-medium text-slate-800">
                  {booking.passenger?.contactNo ||
                    booking.passenger?.phone ||
                    "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-600">NIC</span>
                <p className="font-medium text-slate-800">
                  {booking.passenger?.nic || "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Email</span>
                <p className="font-medium text-slate-800">
                  {booking.passenger?.email || "-"}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 text-xs sm:text-sm">
              <span className="text-slate-600">Booked At</span>
              <p className="font-medium text-slate-800">{bookedAt}</p>
            </div>
          </div>

          {/* Bus & Trip block */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
              <svg
                className="w-5 h-5 text-blue-900"
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
              Bus & Trip Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-slate-600">Bus</span>
                <p className="font-medium text-slate-800">
                  {bus.busName || "-"} {bus.busNo ? `(${bus.busNo})` : ""}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Route</span>
                <p className="font-medium text-slate-800">{routeLabel}</p>
              </div>
              <div>
                <span className="text-slate-600">Travel Date</span>
                <p className="font-medium text-slate-800">
                  {booking.travelDate || "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Departure</span>
                <p className="font-medium text-slate-800">
                  {bus.schedule?.departure || "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Pickup</span>
                <p className="font-medium text-slate-800">
                  {booking.pickup || "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Drop</span>
                <p className="font-medium text-slate-800">
                  {booking.drop || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Seats & Payment block */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
              <svg
                className="w-5 h-5 text-blue-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Seats & Payment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-slate-600">Seats (No + Gender)</span>
                <p className="font-medium text-slate-800">
                  {seatDisplay || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Seat Count</span>
                <p className="font-medium text-slate-800">{seatCount}</p>
              </div>
              <div>
                <span className="text-slate-600">Price per Seat</span>
                <p className="font-medium text-slate-800">
                  LKR {pricePerSeat.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Total</span>
                <p className="font-bold text-blue-900 text-base sm:text-lg">
                  LKR {baseAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Payment</span>
                <p className="font-medium text-slate-800">
                  {booking.payment || "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Status</span>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-[11px] font-semibold ${
                    booking.status === "Confirmed"
                      ? "bg-emerald-100 text-emerald-800"
                      : booking.status === "Cancelled"
                      ? "bg-red-100 text-red-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {booking.status}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation block (if any) */}
          {isCancelled && (cancelReason || cancelledAt) && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2 text-sm">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Cancellation Details
              </h4>
              <div className="space-y-1.5 text-xs sm:text-sm">
                {cancelReason && (
                  <div>
                    <span className="text-red-700 font-medium">Reason</span>
                    <p className="text-red-800 mt-0.5">{cancelReason}</p>
                  </div>
                )}
                {cancelledAt && (
                  <div>
                    <span className="text-red-700 font-medium">
                      Cancelled At
                    </span>
                    <p className="text-red-800 mt-0.5">{cancelledAt}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-5 sm:mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2 rounded-lg bg-blue-900 text-white text-xs sm:text-sm font-medium hover:bg-blue-800 transition-colors duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
