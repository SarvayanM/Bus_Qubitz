// src/pages/BusBookingHistory.jsx
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Cookies from "js-cookie";
import { getBusesByCompany, getAvailableDatesForBus } from "../../api/bus";
import { getBookingListByBusAndDate } from "../../api/booking";

/* --------------------------------- helpers -------------------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/* -------------------------------- component -------------------------------- */
export default function BusBookingHistory() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [companyId, setCompanyId] = useState("");
  const [buses, setBuses] = useState([]);
  const [busId, setBusId] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [travelDate, setTravelDate] = useState("");

  // table rows (booking docs)
  const [rows, setRows] = useState([]);

  /* -------------------------------- effects -------------------------------- */
  useEffect(() => {
    setCompanyId(Cookies.get("companyId") || "");
  }, []);

  useEffect(() => {
    if (!companyId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await getBusesByCompany(companyId);
        if (!mounted) return;
        const arr = Array.isArray(list) ? list : [];
        setBuses(arr);
        if (!busId && arr.length > 0) setBusId(arr[0]._id);
      } catch (e) {
        setErr(e?.message || "Failed to load buses for your company");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  useEffect(() => {
    // when bus changes, refresh available dates
    if (!busId) {
      setTravelDate("");
      setAvailableDates([]);
      setRows([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const dates = await getAvailableDatesForBus(busId, {
          from: todayYmd(),
          days: 30,
        });
        if (!mounted) return;
        const arr = Array.isArray(dates) ? dates : [];
        setAvailableDates(arr);
        if (arr.length > 0 && !arr.includes(travelDate)) setTravelDate("");
      } catch (e) {
        setErr(e?.message || "Failed to load available dates");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [busId]);

  useEffect(() => {
    // fetch bookings for selected (busId, date)
    if (!busId || !travelDate) {
      setRows([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const res = await getBookingListByBusAndDate(busId, travelDate);
        // Accept both shapes: Array or { bookings: [...] }
        const normalized = Array.isArray(res)
          ? res
          : Array.isArray(res?.bookings)
          ? res.bookings
          : [];
        if (mounted) setRows(normalized);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load bookings");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [busId, travelDate]);

  const totalSeatsBooked = useMemo(
    () =>
      rows.reduce(
        (sum, r) => sum + (Array.isArray(r.seats) ? r.seats.length : 0),
        0
      ),
    [rows]
  );

  const handlePrint = () => window.print();

  /* ----------------------------------- UI ---------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Toaster />
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <span className="text-slate-700 font-medium">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Toaster />
        <div className="rounded-2xl border border-rose-200 bg-white px-8 py-5 shadow-md max-w-md text-center">
          <div className="text-rose-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-slate-700">{err}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen print:bg-white">
      <Toaster />
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen print:hidden" />
      <div className="relative mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-md print:text-black">
            Booking{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-emerald-300 print:text-black print:bg-none">
              History
            </span>
          </h1>
          <p className="mt-2 text-slate-200/80 print:text-slate-700">
            Select a bus and one of its upcoming dates to see bookings.
          </p>
        </header>

        {/* Controls */}
        <section className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl print:border-0 print:shadow-none print:bg-transparent">
          <div className="grid gap-6 p-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Select Bus
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={busId}
                  onChange={(e) => {
                    setBusId(e.target.value);
                    setTravelDate("");
                  }}
                >
                  <option value="">— Choose a bus —</option>
                  {buses.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.busName}
                    </option>
                  ))}
                </select>
                <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-60" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Upcoming Dates
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-slate-900 shadow-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  disabled={!busId || availableDates.length === 0}
                >
                  <option value="">— Select a date —</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-60" />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-3 font-semibold shadow hover:bg-indigo-700 transition ml-auto print:hidden"
                disabled={!busId || !travelDate || rows.length === 0}
                title="Print or Save as PDF"
              >
                <PrinterIcon />
                Print / PDF
              </button>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="mt-8">
          {busId && travelDate ? (
            rows.length > 0 ? (
              <div className="rounded-3xl border border-white/15 bg-white/80 backdrop-blur-xl shadow-2xl overflow-hidden print:shadow-none print:border-0 print:bg-transparent">
                {/* Table Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600/90 to-emerald-600/90 text-white print:bg-white print:text-black">
                  <div className="text-lg font-semibold">
                    Bookings — {travelDate}
                  </div>
                  <div className="text-sm opacity-90 print:opacity-100">
                    Generated: {fmtDateTime(new Date().toISOString())}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 print:bg-slate-100">
                      <tr className="text-left">
                        <Th>#</Th>
                        <Th>Passenger</Th>
                        <Th>Gender</Th>
                        <Th>Phone</Th>
                        <Th>Email</Th>
                        <Th>Seats</Th>
                        <Th>Pickup</Th>
                        <Th>Drop</Th>
                        <Th>Payment</Th>
                        <Th>Status</Th>
                        <Th>Travel Date</Th>
                        <Th>Created</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r, i) => (
                        <tr
                          key={r._id || i}
                          className="odd:bg-white even:bg-slate-50"
                        >
                          <Td>{i + 1}</Td>
                          <Td>
                            <div className="font-semibold text-slate-900">
                              {r?.passenger?.fname} {r?.passenger?.lname}
                            </div>
                          </Td>
                          <Td>{r?.passenger?.gender || "-"}</Td>
                          <Td>{r?.passenger?.phone || "-"}</Td>
                          <Td className="break-all">{r?.email || "-"}</Td>
                          <Td>
                            {Array.isArray(r.seats) && r.seats.length
                              ? r.seats.join(", ")
                              : "—"}
                          </Td>
                          <Td>{r?.pickup || "-"}</Td>
                          <Td>{r?.drop || "-"}</Td>
                          <Td>{r?.payment || "-"}</Td>
                          <Td>
                            <StatusBadge status={r?.status} />
                          </Td>
                          <Td>{r?.travelDate || "-"}</Td>
                          <Td>{fmtDateTime(r?.createdAt)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Totals */}
                <div className="flex items-center justify-end gap-6 px-6 py-4 bg-slate-50 print:bg-transparent">
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">
                      {rows.length}
                    </span>{" "}
                    booking(s),
                    <span className="font-semibold text-slate-800">
                      {" "}
                      {totalSeatsBooked}
                    </span>{" "}
                    seat(s) total
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 backdrop-blur-xl p-8 text-center">
                <h3 className="font-semibold text-slate-900 mb-2">
                  No bookings
                </h3>
                <p className="text-slate-600">
                  There are no bookings for the selected bus and date.
                </p>
              </div>
            )
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 backdrop-blur-xl p-8 text-center">
              <h3 className="font-semibold text-slate-900 mb-2">
                No selection yet
              </h3>
              <p className="text-slate-600">
                Choose a <span className="font-medium">Bus</span> and an{" "}
                <span className="font-medium">Upcoming Date</span> to view
                bookings.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Print stylesheet */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:text-black { color: #000 !important; }
          .print\\:bg-white { background: #fff !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

/* --------------------------------- atoms ---------------------------------- */
function Chevron({ className = "" }) {
  return (
    <svg
      className={`h-5 w-5 text-slate-500 ${className}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function Th({ children }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap">
      {children}
    </th>
  );
}
function Td({ children }) {
  return (
    <td className="px-4 py-3 text-slate-800 align-top whitespace-nowrap">
      {children}
    </td>
  );
}
function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const map = {
    confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        map[s] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {status || "-"}
    </span>
  );
}
function PrinterIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path strokeWidth="1.8" d="M7 8V4h10v4M6 17h12v3H6z" />
      <rect x="3" y="9" width="18" height="8" rx="2" strokeWidth="1.8" />
    </svg>
  );
}
