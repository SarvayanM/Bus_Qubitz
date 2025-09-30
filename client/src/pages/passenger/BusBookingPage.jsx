// src/pages/BusBookingDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBuses, getBusById } from "../../api/bus"; // 👈 added getBusById

// ---------- helpers ----------
const pad2 = (n) => String(n).padStart(2, "0");
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const addDaysYmd = (d, days) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};
const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// ---------- main ----------
export default function BusBookingPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [buses, setBuses] = useState([]);
  const [busId, setBusId] = useState("");
  const [busDetails, setBusDetails] = useState(null); // 👈 holds details from getBusById
  const [searchParams] = useSearchParams();
  const [travelDate, setTravelDate] = useState("");

  // -------- pick busId from URL --------
  useEffect(() => {
    const q = searchParams.get("busId");
    if (q) setBusId(q);
  }, [searchParams]);

  // -------- fetch bus list --------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getBuses();
        if (!mounted) return;
        setBuses(list);
      } catch (e) {
        setErr(e?.message || "Failed to load buses");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // -------- fetch full details when busId changes --------
  useEffect(() => {
    if (!busId) {
      setBusDetails(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const details = await getBusById(busId);
        if (!mounted) return;
        setBusDetails(details);
      } catch (e) {
        setErr(e?.message || "Failed to load bus details");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [busId]);

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-100">
        <div className="rounded-xl border bg-white px-6 py-4 shadow">
          Loading…
        </div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-100">
        <div className="rounded-xl border bg-white px-6 py-4 shadow text-red-600">
          {err}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black flex flex-col">
      <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 mt-8 mb-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ===== Left: Select Bus ===== */}
          <section className="lg:col-span-2 rounded-2xl bg-white border border-gray-300 p-6 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bus selector */}
              <div className="text-sm flex flex-col gap-1">
                <span className="text-gray-800 font-medium">Bus</span>
                <select
                  className="rounded-md border border-gray-400 px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={busId}
                  onChange={(e) => setBusId(e.target.value)}
                >
                  <option value="">Select Bus</option>
                  {buses.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.busNo} — {b.route?.from} → {b.route?.to} ({b.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Travel Date */}
              <div className="text-sm flex flex-col gap-1">
                <span className="text-gray-800 font-medium">Travel Date</span>
                <input
                  type="date"
                  min={todayYmd()}
                  className="rounded-md border border-gray-400 px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                />
              </div>
            </div>

            {/* Bus details */}
            {busDetails ? (
              <div className="mt-6 rounded-lg border border-gray-300 bg-gray-50 p-4 shadow-inner">
                <h2 className="text-lg font-semibold text-gray-900">
                  {busDetails.busNo} ({busDetails.type})
                </h2>
                <p className="text-sm text-gray-700 mt-1">
                  Route: {busDetails.route?.from} → {busDetails.route?.to}
                </p>
                <p className="text-sm text-gray-700">
                  Departure: {busDetails.schedule?.departure} | Arrival:{" "}
                  {busDetails.schedule?.arrival}
                </p>
                <p className="text-sm text-gray-700">
                  Price per seat: LKR {busDetails.price}
                </p>
                <p className="text-sm text-gray-700">
                  Total seats: {busDetails.seats}
                </p>
              </div>
            ) : (
              <p className="mt-6 text-sm text-gray-600">
                Select a bus to see details.
              </p>
            )}
          </section>

          {/* ===== Right: Placeholder for Summary ===== */}
          <aside className="rounded-2xl bg-white border border-gray-300 p-6 shadow-md h-fit">
            <h2 className="text-lg font-semibold text-gray-900">
              Booking Summary
            </h2>
            {busDetails ? (
              <p className="text-sm text-gray-700 mt-3">
                {busDetails.busNo} — {busDetails.route?.from} →{" "}
                {busDetails.route?.to}
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-3">
                No bus selected yet.
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
