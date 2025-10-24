// frontend/src/pages/BookingHistory.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Cookies from "js-cookie";
import toast, { Toaster } from "react-hot-toast";
import {
  getPassengerBookingHistoryByPhone,
  cancelBookingById,
} from "../../api/booking"; // add these (see API section)

// ---------- Small UI bits ----------
function Badge({ children, tone = "teal" }) {
  const tones = {
    teal: "bg-teal-100 text-teal-800 border-teal-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    red: "bg-red-100 text-red-800 border-red-200",
    green: "bg-green-100 text-green-800 border-green-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// ---------- Time helpers (Asia/Colombo, no DST) ----------
const TZ = "Asia/Colombo";
function toDepartureDate(travelDate, timeHHMM) {
  // travelDate: "YYYY-MM-DD"; timeHHMM: "HH:mm"
  // Build a local Date in Colombo
  const [y, m, d] = (travelDate || "").split("-").map(Number);
  const [hh, mm] = (timeHHMM || "00:00").split(":").map(Number);
  // Create as local; JS Date uses system TZ, but we only need consistent differences.
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
  if (hoursBefore >= 4) return 0; // 6h–4h window => no refund, still cancellable
  return -1; // not cancellable
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
    // tick every second
    intervalRef.current = setInterval(
      () => setNowLeft(msUntil(departAt)),
      1000
    );
    return () => clearInterval(intervalRef.current);
  }, [travelDate, departTime]);

  const hoursLeft = nowLeft / 3600000;
  const pct = refundPercent(hoursLeft);
  const cancellable = pct >= 0; // inside >=4h window (or earlier)
  const withinWindow = hoursLeft >= 4; // strictly allowed to cancel

  if (!cancellable) {
    return (
      <div className="text-xs text-slate-500">Cancellation window passed</div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-slate-600">
        Time left: <span className="font-mono">{fmtHMS(nowLeft)}</span>
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
          <span className="text-xs text-slate-500">
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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-white/95 p-5 shadow-xl">
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
        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        onClick={() => setOpen(true)}
      >
        Cancel
      </button>

      <Modal open={open} onClose={() => !submitting && setOpen(false)}>
        <h3 className="text-lg font-semibold text-slate-900">Cancel booking</h3>
        <p className="mt-1 text-sm text-slate-700">
          Refund: <span className="font-semibold">{refundPct}%</span> will be
          credited to your wallet.
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-800 mb-1">
            Reason for cancellation
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Close
          </button>
          <button
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            onClick={doCancel}
            disabled={submitting || !reason}
          >
            {submitting ? "Cancelling…" : "Confirm Cancel"}
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

  // Identify by phone (cookie)
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

  const surface =
    "rounded-2xl border border-white/60 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-sm";
  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  if (state.loading) {
    return (
      <div className="relative">
        <Toaster />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/75 via-white/60 to-white/75 backdrop-blur-sm" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
          <div className={surface + " p-8"}>
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-1/3 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="relative">
        <Toaster />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/75 via-white/60 to-white/75 backdrop-blur-sm" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-red-200 bg-white/95 p-4 text-red-800 shadow">
            <p className="font-semibold">Failed to load booking history</p>
            <p className="text-sm opacity-90">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Toaster />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/80 via-white/65 to-white/80 backdrop-blur-sm" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 text-slate-800">
        {/* Header */}
        <div
          className={
            "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between " +
            surface +
            " p-5"
          }
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Your Booking History
            </h1>
            <p className="text-sm text-slate-700">
              Phone: <span className="font-medium">{phone || "—"}</span> · Total{" "}
              <span className="font-medium">
                {state.data?.count ?? rows.length}
              </span>{" "}
              bookings
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls + " sm:w-auto"}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputCls + " sm:w-auto"}
            >
              <option>All</option>
              <option>Confirmed</option>
              <option>Pending</option>
              <option>Cancelled</option>
            </select>
            <input
              type="text"
              placeholder="Search route, pickup/drop, name, phone, operator…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputCls + " sm:w-80"}
            />
          </div>
        </div>

        {/* Table (desktop) */}
        <div className={"hidden overflow-x-auto md:block " + surface}>
          <table className="min-w-full text-left text-sm text-slate-800">
            <thead className="text-slate-800">
              <tr className="bg-white/95">
                <th className="px-5 py-3">Travel Date</th>
                <th className="px-5 py-3">From → To</th>
                <th className="px-5 py-3">Bus / Operator</th>
                <th className="px-5 py-3">Seats</th>
                <th className="px-5 py-3">Pickup / Drop</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Booked At</th>
                <th className="px-5 py-3">Cancel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((b) => (
                <tr key={b._id} className="hover:bg-white/80">
                  <td className="px-5 py-3 font-medium">{b.travelDate}</td>
                  <td className="px-5 py-3">
                    {b?.bus?.from || "—"} <span className="opacity-60">→</span>{" "}
                    {b?.bus?.to || "—"}
                    {b?.bus?.departureTime && (
                      <span className="ml-2 text-xs text-slate-600">
                        ({b.bus.departureTime})
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {b?.bus?.operatorName || "—"}
                      </span>
                      <span className="text-xs text-slate-600">
                        {b?.bus?.plateNo || ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {Array.isArray(b.seats) && b.seats.length > 0
                      ? b.seats.map((s) => s?.number ?? s).join(", ")
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {b?.pickup || "—"} <span className="opacity-60">/</span>{" "}
                    {b?.drop || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="amber">{b?.payment || "—"}</Badge>
                  </td>
                  <td className="px-5 py-3">
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
                  <td className="px-5 py-3 text-xs text-slate-700">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    {b?.status === "Cancelled" ? (
                      <span className="text-xs text-slate-500">
                        Already cancelled
                      </span>
                    ) : (
                      <CancelCell booking={b} onCancelled={reload} />
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-slate-600"
                    colSpan={9}
                  >
                    No bookings found with current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <div className="grid gap-4 md:hidden">
          {rows.length === 0 && (
            <div className={surface + " p-6 text-center text-slate-600"}>
              No bookings found with current filters.
            </div>
          )}
          {rows.map((b) => (
            <div key={b._id} className={surface + " p-4"}>
              <div className="mb-1 flex items-center justify-between">
                <div className="text-sm text-slate-600">Travel Date</div>
                <div className="font-medium text-slate-900">{b.travelDate}</div>
              </div>
              <div className="mb-1 text-sm text-slate-800">
                {b?.bus?.from || "—"} → {b?.bus?.to || "—"}
                {b?.bus?.departureTime && (
                  <span className="ml-1 opacity-60">
                    ({b.bus.departureTime})
                  </span>
                )}
              </div>
              <div className="mb-1 text-sm text-slate-800">
                <span className="font-medium">
                  {b?.bus?.operatorName || "—"}
                </span>{" "}
                <span className="text-xs text-slate-600">
                  {b?.bus?.plateNo || ""}
                </span>
              </div>
              <div className="mb-1 text-sm text-slate-800">
                Seats:{" "}
                {Array.isArray(b.seats) && b.seats.length > 0
                  ? b.seats.map((s) => s?.number ?? s).join(", ")
                  : "—"}
              </div>
              <div className="mb-1 text-sm text-slate-800">
                Pickup / Drop: {b?.pickup || "—"} / {b?.drop || "—"}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone="amber">{b?.payment || "—"}</Badge>
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
                  <span className="ml-auto text-xs text-slate-600">
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>
                {b?.status !== "Cancelled" && (
                  <CancelCell booking={b} onCancelled={reload} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
