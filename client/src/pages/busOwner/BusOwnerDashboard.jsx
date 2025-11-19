// src/pages/busOwner/BusOwnerDashboard.jsx
import { useEffect, useState } from "react";
import {
  fetchCompanyProfile,
  fetchDashboardStats,
  fetchCompanyBuses,
} from "../../api/company";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import BusLoader from "../../components/bus/BusLoader";

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "custom", label: "Custom Range" },
];

export default function BusOwnerDashboard() {
  const [company, setCompany] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);
  const [insights, setInsights] = useState(null);
  const [allBuses, setAllBuses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Global range for stats
  const [rangeType, setRangeType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rangeInfo, setRangeInfo] = useState(null);

  // Filter stats by bus
  const [selectedStatsBusId, setSelectedStatsBusId] = useState("all");

  const buildFilterParams = () => {
    const filters = { rangeType };
    if (rangeType === "custom" && customFrom && customTo) {
      filters.from = customFrom;
      filters.to = customTo;
    }
    if (selectedStatsBusId !== "all") {
      filters.busId = selectedStatsBusId;
    }
    return filters;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const filters = buildFilterParams();

        const [companyRes, statsRes, busesRes] = await Promise.all([
          fetchCompanyProfile(),
          fetchDashboardStats(filters),
          fetchCompanyBuses(),
        ]);

        setCompany(companyRes);
        setKpis(statsRes.kpis);
        setCharts(statsRes.charts);
        setInsights(statsRes.insights);
        setRangeInfo(statsRes.range);
        setAllBuses(busesRes || []);
      } catch (err) {
        console.error("BusOwnerDashboard loadData error:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load admin dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when custom range has both dates, or when not custom
    if (rangeType !== "custom" || (customFrom && customTo)) {
      loadData();
    }
  }, [rangeType, customFrom, customTo, selectedStatsBusId]);

  const handleRangeClick = (key) => {
    setRangeType(key);
    if (key !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
  };

  // ----------------------
  // Full-screen loader / error overlay
  // ----------------------
  // 1. Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <BusLoader
          message="Loading Dashboard..."
          subtext="Fetching Dashboard Datas"
          height="h-56"
          className="max-w-lg"
        />
      </div>
    );
  }

  // 2. Show error screen
  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <BusLoader
          message="Error loading Dashboard"
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

  // ----------------------
  // Main dashboard content
  // ----------------------

  const k = kpis || {};
  const c = charts || { bookingsTrend: [], revenueTrend: [] };
  const i = insights || { topRoutes: [], topBuses: [], topCancelledRoutes: [] };

  const globalRangeLabel =
    rangeInfo &&
    `${rangeInfo.from} → ${rangeInfo.to}${
      rangeInfo.rangeType === "today" ? " (Today)" : ""
    }`;

  const busFilterOptions = [
    { value: "all", label: "All Buses" },
    ...allBuses.map((b) => ({ value: b._id, label: b.busName })),
  ];

  const currentBusFilterLabel =
    selectedStatsBusId === "all"
      ? "All Buses"
      : busFilterOptions.find((b) => b.value === selectedStatsBusId)?.label ||
        "Selected Bus";

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-md border-b border-slate-200/70 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 mt-14">
          {/* Centered Company Name */}
          <div className="w-full flex flex-col items-center justify-center text-center gap-1 in-view animate-fly-in-from-top">
            <p className="text-[11px] tracking-[0.22em] uppercase text-blue-900/70 font-semibold mb-1">
              Welcome To Bus Owner Performance Hub
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900 tracking-tight">
              {company?.companyName || "Company"} Dashboard
            </h1>

            <p className="mt-1 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
              Everything you need in one place -{" "}
              <span className="font-semibold text-blue-900">
                smart insights, clean metrics, and a clear overview
              </span>{" "}
              of your bus operations
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Global Filter bar + Bus filter */}
        <section className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg p-6 border border-slate-100 in-view animate-fly-in-from-top">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Range buttons */}
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleRangeClick(opt.key)}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold border transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${
                    rangeType === opt.key
                      ? "bg-blue-900 text-white border-blue-900 shadow-lg shadow-blue-900/25"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom range + Bus filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              {rangeType === "custom" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-200 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      From
                    </label>
                    <input
                      type="date"
                      className="border border-slate-300 rounded-xl text-xs sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-200 bg-white cursor-pointer"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                    />
                  </div>
                  <span className="text-slate-400 text-sm sm:text-base">→</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      To
                    </label>
                    <input
                      type="date"
                      className="border border-slate-300 rounded-xl text-xs sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-200 bg-white cursor-pointer"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Bus filter for stats */}
              <div className="flex flex-col min-w-[200px] w-full sm:w-auto">
                <label className="text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Filter by Bus
                </label>
                <select
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all duration-200 cursor-pointer bg-white shadow-sm"
                  value={selectedStatsBusId}
                  onChange={(e) => setSelectedStatsBusId(e.target.value)}
                >
                  {busFilterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 text-[11px] text-slate-400">
                  Currently viewing:{" "}
                  <span className="font-medium text-blue-900">
                    {currentBusFilterLabel}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* KPI Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 in-view animate-fly-in-from-bottom">
          <KpiCard label="Total Buses" metric={k.totalBuses} icon="🚌" />
          <KpiCard label="Bookings" metric={k.totalBookings} icon="📦" />
          <KpiCard
            label="Revenue"
            metric={k.revenue}
            icon="💰"
            formatter={(v) => `LKR ${Number(v || 0).toLocaleString()}`}
          />
          <KpiCard label="Cancellations" metric={k.cancellations} icon="⚠️" />
          <KpiCard
            label="Occupancy Rate"
            metric={k.occupancyRate}
            icon="📈"
            formatter={(v) => `${Number(v || 0).toFixed(1)}%`}
          />
          <KpiCard label="Trips" metric={k.trips} icon="🧭" />
        </section>

        {/* Charts Row */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white/90 rounded-3xl shadow-lg p-6 border border-slate-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 in-view animate-fly-in-from-left">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-900 rounded-full"></span>
                Bookings Trend
              </h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={c.bookingsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(d) => d.slice(5)}
                    stroke="#cbd5e1"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.18)",
                      backgroundColor: "white",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#1e3a8a"
                    strokeWidth={3}
                    dot={{ fill: "#1e3a8a", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#1e40af" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/90 rounded-3xl shadow-lg p-6 border border-slate-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 in-view animate-fly-in-from-right">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-900 rounded-full"></span>
                Revenue Trend
              </h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={c.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(d) => d.slice(5)}
                    stroke="#cbd5e1"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.18)",
                      backgroundColor: "white",
                    }}
                    formatter={(value) => [
                      `LKR ${Number(value).toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="amount" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Insights Row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 in-view animate-fly-in-from-bottom">
          <InsightCard title="Top Routes" items={i.topRoutes} type="routes" />
          <InsightCard title="Top Buses" items={i.topBuses} type="buses" />
          <InsightCard
            title="Most Cancelled Routes"
            items={i.topCancelledRoutes}
            type="cancelled"
          />
        </section>
      </main>
    </div>
  );
}

// ----------------------
// KPI Card
// ----------------------
function KpiCard({ label, metric, icon, formatter }) {
  const value = metric?.value ?? (typeof metric === "number" ? metric : 0);
  const delta = metric?.deltaPercent ?? null;

  let deltaText = "";
  let deltaClass = "text-slate-400 bg-slate-50";
  let arrow = "";

  if (delta !== null) {
    const rounded = Math.round(delta);
    if (rounded > 0) {
      arrow = "▲";
      deltaClass = "text-emerald-700 bg-emerald-50";
      deltaText = `${arrow} ${rounded}% vs prev`;
    } else if (rounded < 0) {
      arrow = "▼";
      deltaClass = "text-red-700 bg-red-50";
      deltaText = `${arrow} ${Math.abs(rounded)}% vs prev`;
    } else {
      deltaText = "No change vs prev";
    }
  }

  const displayValue =
    typeof formatter === "function" ? formatter(value) : value;

  return (
    <div className="bg-white/90 rounded-3xl shadow-lg p-5 flex flex-col justify-between border border-slate-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group cursor-pointer in-view animate-fly-in-from-bottom">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800 transition-colors tracking-wide uppercase">
          {label}
        </span>
        <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </span>
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold text-blue-900 mb-2 group-hover:text-blue-800 transition-colors">
        {displayValue}
      </div>
      {delta !== null && (
        <div
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all duration-300 ${deltaClass}`}
        >
          <span>{deltaText}</span>
        </div>
      )}
    </div>
  );
}

// ----------------------
// Insight Card
// ----------------------
function InsightCard({ title, items, type }) {
  const getIcon = () => {
    switch (type) {
      case "routes":
        return "🛣️";
      case "buses":
        return "🚌";
      case "cancelled":
        return "❌";
      default:
        return "📊";
    }
  };

  const getColor = () => {
    switch (type) {
      case "routes":
        return "text-emerald-600";
      case "buses":
        return "text-blue-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-slate-600";
    }
  };

  return (
    <div className="bg-white/90 rounded-3xl shadow-lg p-6 border border-slate-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 in-view animate-fly-in-from-bottom">
      <div className="flex items-center gap-3 mb-4">
        <div className={`text-2xl ${getColor()}`}>{getIcon()}</div>
        <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
      </div>

      {(!items || items.length === 0) && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm text-slate-400">
            No data available for this range
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {items?.map((item, idx) => {
          if (type === "routes") {
            return (
              <li
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-all duration-200 cursor-pointer group border border-transparent hover:border-blue-200"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800 group-hover:text-blue-900 transition-colors truncate block">
                    {item.route}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-700">
                    {item.bookings} bookings
                  </div>
                  <div className="text-xs text-emerald-600 font-medium">
                    LKR {item.revenue?.toLocaleString()}
                  </div>
                </div>
              </li>
            );
          } else if (type === "buses") {
            return (
              <li
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-all duration-200 cursor-pointer group border border-transparent hover:border-blue-200"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800 group-hover:text-blue-900 transition-colors truncate block">
                    {item.busName}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-700">
                    {item.bookings} bookings
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    LKR {item.revenue?.toLocaleString()}
                  </div>
                </div>
              </li>
            );
          } else {
            return (
              <li
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-red-50 transition-all duration-200 cursor-pointer group border border-transparent hover:border-red-200"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800 group-hover:text-red-900 transition-colors truncate block">
                    {item.route}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-red-600">
                    {item.cancellations} cancellations
                  </div>
                </div>
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
}
