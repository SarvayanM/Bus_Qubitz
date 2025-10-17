// frontend/src/pages/BookingHistory.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getPassengerBookingHistory } from "../../api/booking";
import Cookies from "js-cookie";

function Badge({ children, tone = "teal" }) {
  const tones = {
    teal: "bg-teal-100 text-teal-800 border-teal-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    red: "bg-red-100 text-red-800 border-red-200",
    green: "bg-green-100 text-green-800 border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function BookingHistory() {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All"); // uses TOP-LEVEL status
  const [date, setDate] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setEmail(Cookies.get("email") || "");
  }, []);

  useEffect(() => {
    if (!email) return;
    let mounted = true;
    (async () => {
      try {
        const json = await getPassengerBookingHistory(email);
        if (mounted) setState({ loading: false, error: "", data: json });
      } catch (e) {
        if (mounted) setState({ loading: false, error: e.message, data: null });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [email]);

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

  /* ---------- Surfaces ---------- */
  const surface =
    "rounded-2xl border border-white/60 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-sm";
  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  if (state.loading) {
    return (
      <div className="relative">
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
              Email:{" "}
              <span className="font-medium">{state.data?.email || "—"}</span> ·
              Total{" "}
              <span className="font-medium">{state.data?.count ?? 0}</span>{" "}
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
                    {Array.isArray(b.seats) ? b.seats.join(", ") : "—"}
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
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-slate-600"
                    colSpan={8}
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
                Seats: {Array.isArray(b.seats) ? b.seats.join(", ") : "—"}
              </div>

              <div className="mb-1 text-sm text-slate-800">
                Pickup / Drop: {b?.pickup || "—"} / {b?.drop || "—"}
              </div>

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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
