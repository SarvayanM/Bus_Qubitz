// frontend/src/pages/BookingHistory.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import BusLoader from "../../components/bus/BusLoader";
import {
  getPassengerBookingHistoryByPhone,
  cancelBookingById,
} from "../../api/booking";
import { getCancelledBookingsByPhone } from "../../api/cancelledBookings";
import {
  toDepartureDate,
  msUntil,
  fmtHMS,
  refundPercent,
} from "../../utils/time";

/* ----------------------------- inline icons ----------------------------- */
const SearchIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
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
    aria-hidden="true"
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
    aria-hidden="true"
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
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-900 border border-blue-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
    gray: "bg-gray-50 text-gray-800 border border-gray-200",
    red: "bg-red-50 text-red-800 border border-red-200",
    green: "bg-green-50 text-green-800 border border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const CANCEL_REASONS = [
  "Change of plans",
  "Illness / emergency",
  "Booked by mistake",
  "Found alternative transport",
  "Other",
];

/* --------------------------- modal & cancel flow --------------------------- */
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-xl border border-gray-200 p-6 shadow-2xl bg-white animate-scaleIn">
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
    if (!reason)
      return toast.error("Please select a reason", {
        duration: 1600,
        className:
          "rounded-xl border border-red-200 text-red-900 shadow-sm text-sm font-medium",
        iconTheme: { primary: "#7f1d1d", secondary: "#fff" },
      });

    try {
      setSubmitting(true);
      const res = await cancelBookingById(booking._id, { reason });
      toast.success(
        `Cancelled. Refunded ${res?.refundedAmount ?? 0} to wallet.`,
        {
          duration: 2000,
          className:
            "rounded-xl border border-blue-200 text-blue-900 shadow-sm text-sm font-semibold",
          iconTheme: { primary: "#0c4a6e", secondary: "#fff" },
        }
      );
      setOpen(false);
      onCancelled?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Cancel failed", {
        duration: 1800,
        className:
          "rounded-xl border border-red-200 text-red-900 shadow-sm text-sm font-medium",
        iconTheme: { primary: "#7f1d1d", secondary: "#fff" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 active:scale-95 cursor-pointer"
        onClick={() => setOpen(true)}
        type="button"
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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 cursor-pointer"
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
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 active:scale-95 cursor-pointer"
            onClick={() => setOpen(false)}
            disabled={submitting}
            type="button"
          >
            Close
          </button>
          <button
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onClick={doCancel}
            disabled={submitting || !reason}
            type="button"
          >
            {submitting ? "Cancelling..." : "Confirm Cancel"}
          </button>
        </div>
      </Modal>
    </>
  );
}

function CancelCell({ booking, onCancelled }) {
  const departTime =
    booking?.departureTime ||
    booking?.bus?.schedule?.departure ||
    booking?.bus?.departureTime ||
    "00:00";

  const departAt = toDepartureDate(booking.travelDate, departTime);
  const [nowLeft, setNowLeft] = useState(msUntil(departAt));
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setNowLeft(msUntil(departAt)),
      1000
    );
    return () => clearInterval(intervalRef.current);
  }, [booking.travelDate, departTime]);

  const hoursLeft = nowLeft / 3600000;
  const pct = refundPercent(hoursLeft);
  const cancellable = pct >= 0;
  const withinWindow = hoursLeft >= 4;

  if (!cancellable) {
    return (
      <div className="text-xs text-gray-600 font-semibold">
        Cancellation window passed
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-sm text-gray-800">
        <ClockIcon />
        <span className="font-mono font-semibold tracking-tight">
          {fmtHMS(nowLeft)}
        </span>
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
          <span className="text-xs text-gray-600 font-semibold">
            (&lt; 4h left — no cancel)
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- main page ------------------------------- */
export default function BookingHistory() {
  const [activeState, setActiveState] = useState({
    loading: true,
    error: "",
    data: null,
  }); // normal bookings
  const [cancelledState, setCancelledState] = useState({
    loading: false,
    error: "",
    data: null,
  }); // cancelled bookings
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Confirmed");
  const [date, setDate] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setPhone(Cookies.get("phone") || "");
  }, []);

  const loadActive = async (p) => {
    if (!p) return;
    setActiveState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const json = await getPassengerBookingHistoryByPhone(p);
      setActiveState({ loading: false, error: "", data: json });
    } catch (e) {
      setActiveState({ loading: false, error: e.message, data: null });
    }
  };

  const loadCancelled = async (p) => {
    if (!p) return;
    setCancelledState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const json = await getCancelledBookingsByPhone(p);
      setCancelledState({ loading: false, error: "", data: json });
    } catch (e) {
      setCancelledState({ loading: false, error: e.message, data: null });
    }
  };

  // initial load for active bookings
  useEffect(() => {
    if (phone) loadActive(phone);
  }, [phone]);

  // when user flips to "Cancelled", fetch cancelled list (lazy)
  useEffect(() => {
    if (
      status === "Cancelled" &&
      phone &&
      !cancelledState.data &&
      !cancelledState.loading
    ) {
      loadCancelled(phone);
    }
  }, [status, phone]); // eslint-disable-line

  const usingCancelledDataset = status === "Cancelled";
  const baseList = usingCancelledDataset
    ? cancelledState.data?.items || []
    : activeState.data?.bookings || [];

  // normalize records so table rendering stays simple
  const normalizedRows = useMemo(() => {
    return baseList.map((item) => {
      if (!usingCancelledDataset) return item; // already a live Booking doc

      // CancelledBooking shape -> normalize to booking-like for UI reuse
      const b = item.booking || {};
      return {
        _id: item._id, // this is the cancelled document id, fine for row key
        travelDate: b.travelDate,
        departureTime: b.departureTime || b?.bus?.schedule?.departure,
        seats: b.seats,
        pickup: b.pickup,
        drop: b.drop,
        payment: b.payment,
        createdAt: b.createdAt || item.processedAt, // fallback
        status: "Cancelled",
        reason: item.reason || b.reason,
        passenger: b.passenger,
        bus: b.bus,
        // expose cancel meta for UI if needed
        _cancelMeta: {
          refundPercent: item.refundPercent,
          refundedAmount: item.refundedAmount,
          processedAt: item.processedAt,
        },
      };
    });
  }, [baseList, usingCancelledDataset]);

  // search + filter + date
  const rows = useMemo(() => {
    return normalizedRows
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
        status === "All" || usingCancelledDataset
          ? true
          : (b?.status || "").toLowerCase() === status.toLowerCase()
      )
      .filter((b) => (date ? String(b?.travelDate) === date : true));
  }, [normalizedRows, query, status, date, usingCancelledDataset]);

  const anyCancellable = useMemo(() => {
    if (usingCancelledDataset) return false;
    return rows.some((b) => {
      if (!b || b?.status === "Cancelled") return false;
      const departTime =
        b?.departureTime ||
        b?.bus?.schedule?.departure ||
        b?.bus?.departureTime ||
        "00:00";
      const departAt = toDepartureDate(b?.travelDate, departTime);
      const hoursLeft = msUntil(departAt) / 3600000;
      return refundPercent(hoursLeft) >= 0;
    });
  }, [rows, usingCancelledDataset]);

  const passengerDisplayName = (() => {
    const p = usingCancelledDataset
      ? cancelledState.data?.passenger
      : activeState.data?.passenger;
    if (p && (p.fname || p.lname))
      return `${(p.fname || "").trim()} ${(p.lname || "").trim()}`.trim();
    const first = rows[0]?.passenger;
    if (first && (first.fname || first.lname))
      return `${(first.fname || "").trim()} ${(
        first.lname || ""
      ).trim()}`.trim();
    return null;
  })();

  const pageLoading = usingCancelledDataset
    ? cancelledState.loading
    : activeState.loading;
  const pageError = usingCancelledDataset
    ? cancelledState.error
    : activeState.error;

  const refreshCurrent = () => {
    if (usingCancelledDataset) {
      loadCancelled(phone);
    } else {
      loadActive(phone);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 hover:shadow-sm";

  if (pageLoading) {
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
  if (pageError) {
    return (
      <div className="min-h-screen py-8">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-xl border border-red-200 p-6 text-red-900 shadow-sm">
            <p className="font-bold text-lg mb-2">
              Failed to load booking history
            </p>
            <p className="text-sm opacity-90">{pageError}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalCount = usingCancelledDataset
    ? cancelledState.data?.count ?? rows.length
    : activeState.data?.count ?? rows.length;

  return (
    <div className="min-h-screen py-24">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Booking History
          </h1>
          <p className="text-gray-700">
            Passenger:{" "}
            <span className="font-semibold text-blue-900">
              {passengerDisplayName || phone || "—"}
            </span>{" "}
            • Total{" "}
            <span className="font-semibold text-blue-900">{totalCount}</span>{" "}
            {usingCancelledDataset ? "cancelled bookings" : "bookings"}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls + " pl-10 cursor-pointer"}
                aria-label="Filter by travel date"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FilterIcon />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputCls + " pl-10 cursor-pointer"}
                aria-label="Filter by status"
              >
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
                aria-label="Search bookings"
              />
            </div>
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="hidden lg:block rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "Travel Date",
                  "Route",
                  "Bus / Operator",
                  "Seats",
                  "Pickup / Drop",
                  "Status",
                  usingCancelledDataset ? "Cancelled At" : "Booked At",
                  "Cancellation Reason",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
                {!usingCancelledDataset && anyCancellable && (
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((b) => {
                const departTime =
                  b?.departureTime ||
                  b?.bus?.schedule?.departure ||
                  b?.bus?.departureTime ||
                  "00:00";
                const cancelledAt = b?._cancelMeta?.processedAt;
                return (
                  <tr
                    key={b._id}
                    className="transition-colors duration-150 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {b.travelDate || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {b?.bus?.route.from || "—"} → {b?.bus?.route.to || "—"}
                      </div>
                      {departTime && (
                        <div className="text-sm text-gray-700 mt-1">
                          Departure: {departTime}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {b?.bus?.busName || "—"}
                      </div>
                      <div className="text-sm text-gray-700">
                        {b?.bus?.plateNo || b?.bus?.busNo || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-semibold">
                        {Array.isArray(b.seats) && b.seats.length > 0
                          ? b.seats.map((s) => s?.number ?? s).join(", ")
                          : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">
                        <div className="font-semibold">{b?.pickup || "—"}</div>
                        <div className="text-sm text-gray-700">
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
                        {b?.status ||
                          (usingCancelledDataset ? "Cancelled" : "—")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {new Date(
                        usingCancelledDataset ? cancelledAt : b.createdAt
                      ).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {usingCancelledDataset
                        ? b?.reason || "No reason provided"
                        : b?.status === "Cancelled"
                        ? b?.reason ||
                          b?.cancellationReason ||
                          b?.cancelReason ||
                          "No reason provided"
                        : "Booking confirmed — no cancellation reason"}
                      {usingCancelledDataset && b?._cancelMeta && (
                        <div className="mt-1 text-xs text-gray-700">
                          Refund:{" "}
                          <span className="font-semibold">
                            {b._cancelMeta.refundPercent}%
                          </span>{" "}
                          • Amount:{" "}
                          <span className="font-semibold">
                            {b._cancelMeta.refundedAmount}
                          </span>
                        </div>
                      )}
                    </td>
                    {!usingCancelledDataset && anyCancellable && (
                      <td className="px-6 py-4">
                        {b?.status === "Cancelled" ? (
                          <span className="text-sm text-gray-600 font-semibold">
                            Cancelled
                          </span>
                        ) : (
                          <CancelCell
                            booking={b}
                            onCancelled={refreshCurrent}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={!usingCancelledDataset && anyCancellable ? 10 : 9}
                    className="px-6 py-12 text-center"
                  >
                    <div className="text-gray-600 text-lg font-semibold">
                      No bookings found
                    </div>
                    <p className="text-gray-500 mt-2">
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
            <div className="rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <div className="text-gray-600 text-lg font-semibold mb-2">
                No bookings found
              </div>
              <p className="text-gray-500">Try adjusting your filters</p>
            </div>
          )}
          {rows.map((b) => {
            const cancelledAt = b?._cancelMeta?.processedAt;
            return (
              <div
                key={b._id}
                className="rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg tracking-tight">
                        {b?.bus?.from || "—"} → {b?.bus?.to || "—"}
                      </h3>
                      <p className="text-gray-700 text-sm mt-1">
                        {b.travelDate || "—"}
                      </p>
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
                      {b?.status || (usingCancelledDataset ? "Cancelled" : "—")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-800">
                        Operator:
                      </span>
                      <p className="text-gray-900">
                        {b?.bus?.operatorName || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">
                        Departure:
                      </span>
                      <p className="text-gray-900">
                        {b?.departureTime ||
                          b?.bus?.schedule?.departure ||
                          b?.bus?.departureTime ||
                          "—"}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">
                        Seats:
                      </span>
                      <p className="text-gray-900">
                        {Array.isArray(b.seats) && b.seats.length > 0
                          ? b.seats.map((s) => s?.number ?? s).join(", ")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">
                        NIC / Passport:
                      </span>
                      <p className="text-gray-900">
                        {b?.passenger?.nic || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">
                        {usingCancelledDataset ? "Cancelled:" : "Booked:"}
                      </span>
                      <p className="text-gray-900">
                        {new Date(
                          usingCancelledDataset ? cancelledAt : b.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-semibold text-gray-800">
                          Pickup:
                        </span>
                        <p className="text-gray-900">{b?.pickup || "—"}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">
                          Drop:
                        </span>
                        <p className="text-gray-900">{b?.drop || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {(usingCancelledDataset || b?.status === "Cancelled") && (
                    <div className="border-t border-gray-200 pt-4">
                      <span className="font-semibold text-gray-800 text-sm">
                        Cancellation Reason:
                      </span>
                      <p className="text-gray-900 text-sm mt-1">
                        {b?.reason ||
                          b?.cancellationReason ||
                          b?.cancelReason ||
                          "No reason provided"}
                      </p>
                      {usingCancelledDataset && b?._cancelMeta && (
                        <p className="text-gray-700 text-xs mt-1">
                          Refund:{" "}
                          <span className="font-semibold">
                            {b._cancelMeta.refundPercent}%
                          </span>{" "}
                          • Amount:{" "}
                          <span className="font-semibold">
                            {b._cancelMeta.refundedAmount}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {!usingCancelledDataset && b?.status !== "Cancelled" && (
                    <div className="border-t border-gray-200 pt-4">
                      <CancelCell booking={b} onCancelled={refreshCurrent} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
