// src/pages/CheckoutSummary.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  BusFront,
  CalendarDays,
  MapPin,
  Phone,
  User2,
  ArrowLeft,
  Banknote,
  Clock,
  Armchair,
  CheckCircle2,
  CircleX,
} from "lucide-react";
import { createBooking } from "../../api/booking";
import { getPassengerByPhone, createPassenger } from "../../api/passenger";

// Small util to wait for toast duration before navigating
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SUCCESS_TOAST_MS = 2500; // keep in sync with <Toaster/> duration
// Defaults to fatal (true) unless explicitly set to 'false' in env.
const PASSENGER_CREATE_FATAL =
  typeof process !== "undefined" &&
  process.env?.REACT_APP_PASSENGER_CREATE_FATAL !== "false";

export default function CheckoutSummary() {
  const navigate = useNavigate();
  const location = useLocation();

  // Recover state from router or persisted session
  const state =
    location.state ||
    JSON.parse(sessionStorage.getItem("checkout-summary") || "{}");

  const {
    from = "",
    to = "",
    date = "",
    bus = {},
    seats = [],
    passenger = {},
    pickup = "",
    drop = "",
    payment = "",
    total = 0,
  } = state || {};

  const [submitting, setSubmitting] = useState(false);

  // Persist latest state so refresh/back won’t lose it
  useEffect(() => {
    if (state && Object.keys(state).length > 0) {
      sessionStorage.setItem("checkout-summary", JSON.stringify(state));
    }
  }, [state]);

  // Guard: if essential bits are missing, nudge user
  const isStateValid = useMemo(() => {
    return (
      from &&
      to &&
      date &&
      bus &&
      (bus._id || bus.id || bus.busId || bus.busNo) &&
      Array.isArray(seats) &&
      seats.length > 0 &&
      passenger &&
      passenger.phone
    );
  }, [from, to, date, bus, seats, passenger]);

  useEffect(() => {
    if (!isStateValid) {
      toast.error("Your checkout details are incomplete. Please try again.");
    }
  }, [isStateValid]);

  const formattedDate = useMemo(() => {
    if (!date) return "-";
    try {
      const d = new Date(date); // supports ISO or YYYY-MM-DD
      const fmt = new Intl.DateTimeFormat("en-LK", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
      return fmt.format(d);
    } catch {
      return date;
    }
  }, [date]);

  const seatCount = seats?.length || 0;
  const seatNumbers = seats?.map((s) => s.number).sort((a, b) => a - b);
  const prefillsFromAccount = Boolean(
    passenger && (passenger._id || passenger.id || passenger._doc)
  );

  async function handleDone() {
    if (!isStateValid) {
      toast.error("Missing required info. Please review your details.");
      return;
    }

    const payload = {
      busId: bus._id || bus.id || bus.busId || null,
      busNo: bus.busNo,
      busName: bus.busName,
      from,
      to,
      travelDate: date, // keep original (backend handles YYYY-MM-DD/ISO)
      seats: seats.map(({ number, gender }) => ({ number, gender })),
      passenger: {
        fname: passenger.fname || "",
        lname: passenger.lname || "",
        phone: passenger.phone || "",
        pickup,
        drop,
      },
      paymentMethod: payment || "Card",
      total: Number(total || 0),
    };

    // Basic client-side validation
    if (!payload.busId) {
      toast.error("Unable to identify this bus. Please reselect your trip.");
      return;
    }
    if (!payload.passenger.phone) {
      toast.error("Passenger phone number is required.");
      return;
    }
    if (!payload.seats?.length) {
      toast.error("Please select at least one seat.");
      return;
    }

    setSubmitting(true);
    const loadingId = toast.loading("Creating your booking…");

    try {
      // Ensure passenger exists: create only at confirmation time
      try {
        const existing = await getPassengerByPhone(
          payload.passenger.phone
        ).catch(() => null);
        if (!existing) {
          await createPassenger({
            phone: payload.passenger.phone,
            fname: payload.passenger.fname || "",
            lname: payload.passenger.lname || "",
          });
        }
      } catch (err) {
        console.error("Failed to ensure passenger record:", err);
        if (PASSENGER_CREATE_FATAL) {
          // Replace loading toast with error and abort booking
          toast.error("Failed to create passenger record. Booking aborted.", {
            id: loadingId,
          });
          setSubmitting(false);
          return;
        }
        // non-fatal — proceed to booking when configured so
      }

      const { booking } = await createBooking(payload); // normalized to throw on failure
      // success: replace loading toast with success, then wait before navigating
      toast.success("Booking confirmed! 🎉", {
        id: loadingId,
        duration: SUCCESS_TOAST_MS,
      });

      // Clear persisted summary and navigate AFTER toast fully shows
      sessionStorage.removeItem("checkout-summary");
      await sleep(SUCCESS_TOAST_MS + 100);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Booking failed. Please try again.", {
        id: loadingId,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Small presentational helpers
  const Item = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-gray-500">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span>{label}</span>
      </div>
      <span className="font-medium text-gray-900">{value ?? "-"}</span>
    </div>
  );

  const chip = (text) => (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/70 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
      {text}
    </span>
  );

  return (
    <div className="relative min-h-screen">
      {/* Gradient academic backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50" />
      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(90deg,#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,rgba(0,0,0,.17),transparent_60%)]" />

      <div className="relative pt-24 pb-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white shadow-md"
              >
                <CheckCircle2 className="h-6 w-6" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Checkout Summary
                </h1>
                <p className="text-sm text-slate-600">
                  Review your trip details and confirm your booking.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          {/* Card */}
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-slate-200 bg-white/80 shadow-lg backdrop-blur-md"
          >
            <div className="border-b border-slate-200 p-6">
              {/* Route + date row */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <MapPin className="h-4 w-4 text-blue-900" />
                    {from || "-"}
                    <span className="mx-2 text-slate-400">→</span>
                    {to || "-"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    {formattedDate}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {chip(`Seats: ${seatCount}`)}
                  {chip(bus.type || "Unknown type")}
                  {chip(bus.frequency || "One-time")}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              {/* Trip details */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Trip Details
                </h3>
                <div className="space-y-2">
                  <Item label="From" value={from} icon={MapPin} />
                  <Item label="To" value={to} icon={MapPin} />
                  <Item
                    label="Date"
                    value={formattedDate}
                    icon={CalendarDays}
                  />
                  <Item label="Pickup" value={pickup || "-"} icon={MapPin} />
                  <Item label="Drop" value={drop || "-"} icon={MapPin} />
                </div>
              </section>

              {/* Bus details */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Bus
                </h3>
                <div className="space-y-2">
                  <Item
                    label="Bus No"
                    value={bus.busNo || "-"}
                    icon={BusFront}
                  />
                  <Item
                    label="Bus Name"
                    value={bus.busName || "-"}
                    icon={BusFront}
                  />
                  <Item label="Type" value={bus.type || "-"} icon={Armchair} />
                  <Item
                    label="Frequency"
                    value={bus.frequency || "-"}
                    icon={Clock}
                  />
                  <Item
                    label="Departure"
                    value={bus.depart || "-"}
                    icon={Clock}
                  />
                </div>
              </section>

              {/* Seats */}
              <section className="sm:col-span-2">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Seats
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-medium">#</th>
                        <th className="py-2.5 px-3 text-left font-medium">
                          Gender
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {seatNumbers.map((num) => {
                        const g = seats.find((s) => s.number === num)?.gender;
                        return (
                          <tr key={num} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">{num}</td>
                            <td className="py-2.5 px-3">{g || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Passenger & Payment */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Passenger
                </h3>
                {prefillsFromAccount && (
                  <p className="text-xs text-slate-500">
                    Prefilled from account (editable)
                  </p>
                )}
                <div className="space-y-2">
                  <Item
                    label="Name"
                    value={
                      `${passenger.fname || ""} ${
                        passenger.lname || ""
                      }`.trim() || "-"
                    }
                    icon={User2}
                  />
                  <Item
                    label="Phone"
                    value={passenger.phone || "-"}
                    icon={Phone}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Payment
                </h3>
                <div className="space-y-2">
                  <Item label="Method" value={payment || "-"} icon={Banknote} />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total</span>
                    <span className="text-base font-bold text-blue-900">
                      LKR {Number(total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer actions */}
            <div className="flex flex-col items-stretch gap-3 border-t border-slate-200 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleDone}
                disabled={!isStateValid || submitting}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 ${
                  !isStateValid || submitting
                    ? "cursor-not-allowed bg-blue-300"
                    : "bg-blue-900 hover:bg-blue-800"
                }`}
              >
                {submitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Done
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Empty/invalid banner */}
          {!isStateValid && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              <CircleX className="h-4 w-4" />
              <p className="text-sm">
                Some details are missing. You can go back and complete the form
                or start over from the Home page.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Global Toaster moved to App root */}
    </div>
  );
}
