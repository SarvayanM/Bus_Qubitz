// frontend/src/pages/BookingHistory.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import BusLoader from "../../components/bus/BusLoader";
import {
  getPassengerBookingHistoryByPhone,
  cancelBookingById,
} from "../../api/booking";

// ---------- Icons ----------
const SearchIcon = () => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const FilterIcon = () => (
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
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
    />
  </svg>
);

const CalendarIcon = () => (
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
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ClockIcon = () => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// ---------- Small UI bits ----------
function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-100 text-blue-800 border border-blue-200",
    amber: "bg-amber-100 text-amber-800 border border-amber-200",
    gray: "bg-gray-100 text-gray-800 border border-gray-200",
    red: "bg-red-100 text-red-800 border border-red-200",
    green: "bg-green-100 text-green-800 border border-green-200",
    teal: "bg-teal-100 text-teal-800 border border-teal-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// ---------- Time helpers (Asia/Colombo, no DST) ----------
const TZ = "Asia/Colombo";
function toDepartureDate(travelDate, timeHHMM) {
  const [y, m, d] = (travelDate || "").split("-").map(Number);
  const [hh, mm] = (timeHHMM || "00:00").split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return dt;
}
function msUntil(date) {
  return date.getTime() - Date.now();
}
function fmtHMS(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}
function refundPercent(hoursBefore) {
  if (hoursBefore >= 24) return 100;
  if (hoursBefore >= 12) return 75;
  if (hoursBefore >= 6) return 50;
  if (hoursBefore >= 4) return 0;
  return -1;
}

// ---------- Reason options ----------
const CANCEL_REASONS = [
  "Change of plans",
  "Illness / emergency",
  "Booked by mistake",
  "Found alternative transport",
  "Other",
];

// ---------- Countdown + Cancel button ----------
function CancelCell({ booking, onCancelled }) {
  const { travelDate, bus, total } = booking || {};
  const departTime = bus?.departureTime || "00:00";
  const departAt = toDepartureDate(travelDate, departTime);

  const [nowLeft, setNowLeft] = useState(msUntil(departAt));
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setNowLeft(msUntil(departAt)),
      1000
    );
    return () => clearInterval(intervalRef.current);
  }, [travelDate, departTime]);

  const hoursLeft = nowLeft / 3600000;
  const pct = refundPercent(hoursLeft);
  const cancellable = pct >= 0;
  const withinWindow = hoursLeft >= 4;

  if (!cancellable) {
    return (
      <div className="text-xs text-gray-500 font-medium">
        Cancellation window passed
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-sm text-gray-700">
        <ClockIcon />
        <span className="font-mono font-medium">{fmtHMS(nowLeft)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={pct === 0 ? "gray" : pct >= 75 ? "green" : "amber"}>
          Refund: {pct}%
        </Badge>
        {withinWindow ? (
          <CancelAction
            booking={booking}
            refundPct={pct}
            onCancelled={onCancelled}
          />
        ) : (
          <span className="text-xs text-gray-500 font-medium">
            (&lt; 4h left — no cancel)
          </span>
        )}
      </div>
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 animate-fadeIn">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-2xl animate-scaleIn">
        {children}
      </div>
    </div>
  );
}

function CancelAction({ booking, refundPct, onCancelled }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const doCancel = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }
    try {
      setSubmitting(true);
      const res = await cancelBookingById(booking._id, { reason });
      toast.success(
        `Cancelled. Refunded ${
          res?.refundedAmount?.toFixed?.(2) ?? 0
        } to wallet.`
      );
      setOpen(false);
      onCancelled?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Cancel failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setOpen(true)}
      >
        Cancel Booking
      </button>

      <Modal open={open} onClose={() => !submitting && setOpen(false)}>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Booking</h3>
        <p className="text-sm text-gray-700 mb-4">
          Refund:{" "}
          <span className="font-semibold text-blue-900">{refundPct}%</span> will
          be credited to your wallet.
        </p>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Reason for cancellation
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
          >
            <option value="">Select a reason</option>
            {CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Close
          </button>
          <button
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-all duration-200 disabled:opacity-50"
            onClick={doCancel}
            disabled={submitting || !reason}
          >
            {submitting ? "Cancelling..." : "Confirm Cancel"}
          </button>
        </div>
      </Modal>
    </>
  );
}

// ---------- Main ----------
export default function BookingHistory() {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [date, setDate] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setPhone(Cookies.get("phone") || "");
  }, []);

  const reload = async () => {
    if (!phone) return;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const json = await getPassengerBookingHistoryByPhone(phone);
      setState({ loading: false, error: "", data: json });
    } catch (e) {
      setState({ loading: false, error: e.message, data: null });
    }
  };

  useEffect(() => {
    reload();
  }, [phone]);

  const rows = useMemo(() => {
    const list = state.data?.bookings || [];
    return list
      .filter((b) =>
        !query
          ? true
          : [
              b?.passenger?.fname,
              b?.passenger?.lname,
              b?.passenger?.phone,
              b?.bus?.operatorName,
              b?.bus?.from,
              b?.bus?.to,
              b?.pickup,
              b?.drop,
              b?.payment,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase())
      )
      .filter((b) =>
        status === "All"
          ? true
          : (b?.status || "").toLowerCase() === status.toLowerCase()
      )
      .filter((b) => (date ? String(b?.travelDate) === date : true));
  }, [state.data, query, status, date]);

  const anyCancellable = useMemo(() => {
    return rows.some((b) => {
      if (!b || b?.status === "Cancelled") return false;
      const departTime = b?.bus?.departureTime || "00:00";
      const departAt = toDepartureDate(b?.travelDate, departTime);
      const hoursLeft = msUntil(departAt) / 3600000;
      return refundPercent(hoursLeft) >= 0;
    });
  }, [rows]);

  const passengerDisplayName = (() => {
    const p = state.data?.passenger;
    if (p && (p.fname || p.lname))
      return `${(p.fname || "").trim()} ${(p.lname || "").trim()}`.trim();
    const first = rows[0]?.passenger;
    if (first && (first.fname || first.lname))
      return `${(first.fname || "").trim()} ${(
        first.lname || ""
      ).trim()}`.trim();
    return null;
  })();

  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20";

  if (state.loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="mx-auto max-w-3xl">
          <BusLoader
            message="Loading booking history..."
            subtext="This may take a few seconds"
            height="h-64"
            className="mx-auto"
          />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen py-8">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-xl border border-red-200 bg-white p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-lg mb-2">
              Failed to load booking history
            </p>
            <p className="text-sm opacity-90">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking History
          </h1>
          <p className="text-gray-700">
            Passenger:{" "}
            <span className="font-semibold text-blue-900">
              {passengerDisplayName || phone || "—"}
            </span>{" "}
            • Total{" "}
            <span className="font-semibold text-blue-900">
              {state.data?.count ?? rows.length}
            </span>{" "}
            bookings
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls + " pl-10"}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FilterIcon />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputCls + " pl-10"}
              >
                <option>All</option>
                <option>Confirmed</option>
                <option>Pending</option>
                <option>Cancelled</option>
              </select>
            </div>

            <div className="relative md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search route, pickup/drop, name, phone, operator..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={inputCls + " pl-10"}
              />
            </div>
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="hidden lg:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Travel Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Bus / Operator
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Seats
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  NIC / Passport
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Pickup / Drop
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Booked At
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cancellation Reason
                </th>
                {anyCancellable && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((b) => (
                <tr
                  key={b._id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {b.travelDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {b?.bus?.from || "—"} → {b?.bus?.to || "—"}
                    </div>
                    {b?.bus?.departureTime && (
                      <div className="text-sm text-gray-600 mt-1">
                        Departure: {b.bus.departureTime}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {b?.bus?.operatorName || "—"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {b?.bus?.plateNo || ""}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 font-medium">
                      {Array.isArray(b.seats) && b.seats.length > 0
                        ? b.seats.map((s) => s?.number ?? s).join(", ")
                        : "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 font-medium">
                      {b?.passenger?.nic || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">
                      <div className="font-medium">{b?.pickup || "—"}</div>
                      <div className="text-sm text-gray-600">
                        {b?.drop || "—"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      tone={
                        b?.status === "Confirmed"
                          ? "green"
                          : b?.status === "Cancelled"
                          ? "red"
                          : "gray"
                      }
                    >
                      {b?.status || "—"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {b?.status === "Cancelled"
                      ? b?.reason ||
                        b?.cancellationReason ||
                        b?.cancelReason ||
                        "No reason provided"
                      : "Booking confirmed — no cancellation reason"}
                  </td>
                  {anyCancellable && (
                    <td className="px-6 py-4">
                      {b?.status === "Cancelled" ? (
                        <span className="text-sm text-gray-500 font-medium">
                          Cancelled
                        </span>
                      ) : (
                        <CancelCell booking={b} onCancelled={reload} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={anyCancellable ? 10 : 9}
                    className="px-6 py-12 text-center"
                  >
                    <div className="text-gray-500 text-lg font-medium">
                      No bookings found
                    </div>
                    <p className="text-gray-400 mt-2">
                      Try adjusting your filters
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <div className="grid gap-4 lg:hidden">
          {rows.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="text-gray-500 text-lg font-medium mb-2">
                No bookings found
              </div>
              <p className="text-gray-400">Try adjusting your filters</p>
            </div>
          )}
          {rows.map((b) => (
            <div
              key={b._id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {b?.bus?.from || "—"} → {b?.bus?.to || "—"}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">{b.travelDate}</p>
                  </div>
                  <Badge
                    tone={
                      b?.status === "Confirmed"
                        ? "green"
                        : b?.status === "Cancelled"
                        ? "red"
                        : "gray"
                    }
                  >
                    {b?.status || "—"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Operator:</span>
                    <p className="text-gray-900">
                      {b?.bus?.operatorName || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Departure:
                    </span>
                    <p className="text-gray-900">
                      {b?.bus?.departureTime || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Seats:</span>
                    <p className="text-gray-900">
                      {Array.isArray(b.seats) && b.seats.length > 0
                        ? b.seats.map((s) => s?.number ?? s).join(", ")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      NIC / Passport:
                    </span>
                    <p className="text-gray-900">{b?.passenger?.nic || "—"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Booked:</span>
                    <p className="text-gray-900">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Pickup:</span>
                      <p className="text-gray-900">{b?.pickup || "—"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Drop:</span>
                      <p className="text-gray-900">{b?.drop || "—"}</p>
                    </div>
                  </div>
                </div>

                {b?.status === "Cancelled" && (
                  <div className="border-t border-gray-200 pt-4">
                    <span className="font-medium text-gray-700 text-sm">
                      Cancellation Reason:
                    </span>
                    <p className="text-gray-900 text-sm mt-1">
                      {b?.reason ||
                        b?.cancellationReason ||
                        b?.cancelReason ||
                        "No reason provided"}
                    </p>
                  </div>
                )}

                {b?.status !== "Cancelled" &&
                  (function () {
                    const departTime = b?.bus?.departureTime || "00:00";
                    const departAt = toDepartureDate(b?.travelDate, departTime);
                    const hoursLeft = msUntil(departAt) / 3600000;
                    return refundPercent(hoursLeft) >= 0 ? (
                      <div className="border-t border-gray-200 pt-4">
                        <CancelCell booking={b} onCancelled={reload} />
                      </div>
                    ) : null;
                  })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
