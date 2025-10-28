// src/pages/CheckoutSummary.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  BusFront,
  CalendarDays,
  Phone,
  User2,
  Mail,
  ArrowLeft,
  Clock,
  Armchair,
  CheckCircle2,
  CircleX,
  CreditCard,
  MapPinned,
} from "lucide-react";
import { createBooking } from "../../api/booking";
import { getPassengerByPhone, createPassenger } from "../../api/passenger";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SUCCESS_TOAST_MS = 2000;
const ERROR_TOAST_MS = 1800;
const PASSENGER_CREATE_FATAL =
  typeof process !== "undefined" &&
  process.env?.REACT_APP_PASSENGER_CREATE_FATAL !== "false";

const BOOKING_HISTORY_PATH = "/booking-history"; // ← change if your route differs

export default function CheckoutSummary() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read navigation state first, then try both sessionStorage keys (older/newer names)
  const state =
    location.state ||
    JSON.parse(
      sessionStorage.getItem("checkout-summary") ||
        sessionStorage.getItem("checkoutSummary") ||
        "{}"
    );

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

  // Minimal, reliable confirm (no toast)
  const [confirmUI, setConfirmUI] = useState({
    open: false,
    title: "",
    body: "",
    resolve: null,
  });
  const confirm = (title, body) =>
    new Promise((resolve) =>
      setConfirmUI({ open: true, title, body, resolve })
    );
  const closeConfirm = (answer) => {
    if (confirmUI.resolve) confirmUI.resolve(Boolean(answer));
    setConfirmUI({ open: false, title: "", body: "", resolve: null });
  };

  // Persist latest state
  useEffect(() => {
    if (state && Object.keys(state).length > 0) {
      sessionStorage.setItem("checkout-summary", JSON.stringify(state));
    }
  }, [state]);

  // Validations
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
      const d = new Date(date);
      return new Intl.DateTimeFormat("en-LK", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(d);
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

    const ok = await confirm(
      "Confirm booking",
      `Create booking for ${seatCount} seat${
        seatCount !== 1 ? "s" : ""
      } on ${formattedDate}?`
    );
    if (!ok) return;

    const payload = {
      busId: bus._id || bus.id || bus.busId || null,
      busNo: bus.busNo,
      busName: bus.busName,
      from,
      to,
      travelDate: date,
      seats: seats.map(({ number, gender }) => ({ number, gender })),
      passenger: {
        fname: passenger.fname || "",
        lname: passenger.lname || "",
        phone: passenger.phone || "",
        nic: passenger.nic || "",
        email: passenger.email || "",
        pickup,
        drop,
      },
      paymentMethod: payment || "Card",
      total: Number(total || 0),
    };
    <Item label="NIC / Passport" value={passenger.nic || "-"} icon={User2} />;

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
      // Ensure passenger exists
      try {
        const existing = await getPassengerByPhone(
          payload.passenger.phone
        ).catch(() => null);
        if (!existing) {
          await createPassenger({
            phone: payload.passenger.phone,
            fname: payload.passenger.fname || "",
            lname: payload.passenger.lname || "",
            nic: payload.passenger.nic || "",
            email: payload.passenger.email || "",
          });
        }
      } catch (err) {
        console.error("Failed to ensure passenger record:", err);
        if (PASSENGER_CREATE_FATAL) {
          toast.error("Failed to create passenger record. Booking aborted.", {
            id: loadingId,
          });
          setSubmitting(false);
          // show error first, then navigate home
          toast.error("Booking failed.", { duration: ERROR_TOAST_MS });
          await sleep(ERROR_TOAST_MS + 100);
          navigate("/", { replace: true });
          return;
        }
      }

      await createBooking(payload);

      // Success: replace loading, then navigate to booking history AFTER toast
      toast.success("Booking confirmed! 🎉 Redirecting to history…", {
        id: loadingId,
        duration: SUCCESS_TOAST_MS,
      });
      sessionStorage.removeItem("checkout-summary");
      await sleep(SUCCESS_TOAST_MS + 100);
      navigate("/bookingHistory", { replace: true });
    } catch (err) {
      // Error: replace loading with error, then go home AFTER toast
      toast.error(err?.message || "Booking failed. Please try again.", {
        id: loadingId,
        duration: ERROR_TOAST_MS,
      });
      await sleep(ERROR_TOAST_MS + 100);
      navigate("/", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  // NEW: Cancel booking (confirmation + optional redirect)
  async function handleCancel() {
    const ok = await confirm(
      "Cancel booking",
      "Are you sure you want to cancel this booking? Any unsaved progress will be discarded."
    );
    if (!ok) return; // keep user on the same page if they do not confirm
    try {
      sessionStorage.removeItem("checkout-summary");
    } catch {}
    navigate("/", { replace: true });
  }

  // Presentational
  const SectionCard = ({ children, className = "" }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`rounded-xl border border-gray-200 p-4 shadow-sm transition-all hover:shadow-md ${className}`}
    >
      {children}
    </motion.div>
  );

  const Item = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-gray-700">
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-sm font-medium tracking-wide">{label}</span>
      </div>
      <span className="font-semibold text-gray-900 text-sm">
        {value || "-"}
      </span>
    </div>
  );

  const StatusBadge = ({ children, icon: Icon }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-900">
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );

  return (
    <div className="min-h-screen">
      <div className="pt-24 pb-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
              Checkout Summary
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Review your trip before confirming
            </p>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left */}
            <div className="lg:col-span-2 space-y-4">
              {/* Route */}
              <SectionCard>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-900">
                    Journey Details
                  </h2>
                  <div className="flex gap-2">
                    <StatusBadge icon={CalendarDays}>
                      {formattedDate}
                    </StatusBadge>
                    <StatusBadge>
                      {seatCount} Seat{seatCount !== 1 ? "s" : ""}
                    </StatusBadge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                      From
                    </p>
                    <p className="text-lg font-extrabold text-gray-900">
                      {from}
                    </p>
                    {pickup && (
                      <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                        <MapPinned className="h-3 w-3" />
                        <span className="font-medium">Pickup:</span> {pickup}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-10 h-px bg-gray-300 mb-1.5" />
                    <BusFront className="h-5 w-5 text-blue-900" />
                    <div className="w-10 h-px bg-gray-300 mt-1.5" />
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                      To
                    </p>
                    <p className="text-lg font-extrabold text-gray-900">{to}</p>
                    {drop && (
                      <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                        <MapPinned className="h-3 w-3" />
                        <span className="font-medium">Drop:</span> {drop}
                      </p>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Bus / Passenger */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SectionCard>
                  <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-2.5">
                    <BusFront className="h-5 w-5 text-blue-900" />
                    Bus Information
                  </h3>
                  <div className="space-y-1">
                    <Item label="Bus Number" value={bus.busNo} />
                    <Item label="Bus Name" value={bus.busName} />
                    <Item label="Bus Type" value={bus.type} />
                    <Item label="Frequency" value={bus.frequency} />
                    <Item label="Departure" value={bus.depart} icon={Clock} />
                  </div>
                </SectionCard>

                <SectionCard>
                  <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-2.5">
                    <User2 className="h-5 w-5 text-blue-900" />
                    Passenger Details
                  </h3>
                  {prefillsFromAccount && (
                    <p className="text-[11px] text-green-700 mb-2 border border-green-200 px-2 py-0.5 rounded-full inline-block font-semibold">
                      Prefilled from account
                    </p>
                  )}
                  <div className="space-y-1">
                    <Item
                      label="Full Name"
                      value={`${passenger.fname || ""} ${
                        passenger.lname || ""
                      }`.trim()}
                      icon={User2}
                    />
                    <Item label="Phone" value={passenger.phone} icon={Phone} />
                    <Item
                      label="NIC / Passport"
                      value={passenger.nic}
                      icon={User2}
                    />
                    <Item
                      label="Email Address"
                      value={passenger.email}
                      icon={Mail}
                    />
                  </div>
                </SectionCard>
              </div>

              {/* Seats */}
              <SectionCard>
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-2.5">
                  <Armchair className="h-5 w-5 text-blue-900" />
                  Selected Seats
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {seatNumbers.map((seatNumber, index) => {
                    const seat = seats.find((s) => s.number === seatNumber);
                    return (
                      <motion.div
                        key={seatNumber}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ y: -2 }}
                        className="flex flex-col items-center justify-center rounded-md border-2 border-blue-200 p-3 text-center"
                      >
                        <span className="text-xl font-extrabold text-blue-900">
                          {seatNumber}
                        </span>
                        <span className="text-[11px] text-gray-600 mt-0.5 capitalize">
                          {seat?.gender || "Not specified"}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </SectionCard>
            </div>

            {/* Right */}
            <div className="space-y-4">
              <SectionCard>
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-2.5">
                  <CreditCard className="h-5 w-5 text-blue-900" />
                  Payment Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">
                      Payment Method
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {payment}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        Total Amount
                      </span>
                      <span className="text-xl text-blue-900 font-extrabold">
                        LKR {Number(total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirm Button with elegant processing effect */}
                <motion.button
                  whileHover={!submitting ? { scale: 1.02 } : {}}
                  whileTap={!submitting ? { scale: 0.98 } : {}}
                  onClick={handleDone}
                  disabled={!isStateValid || submitting}
                  className={`relative mt-4 w-full rounded-lg py-3 text-sm font-semibold text-white shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 ${
                    !isStateValid || submitting
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-blue-900 hover:opacity-90 cursor-pointer"
                  }`}
                >
                  {/* Animated sheen when processing */}
                  <AnimatePresence>
                    {submitting && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 overflow-hidden rounded-lg"
                      >
                        <motion.span
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.6,
                            ease: "linear",
                          }}
                          className="absolute inset-y-0 w-1/2 opacity-20"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.9) 50%, rgba(255,255,255,0) 100%)",
                          }}
                        />
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
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
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Confirm Booking
                    </div>
                  )}
                </motion.button>

                {/* NEW: Cancel Booking (below confirm) */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleCancel}
                  disabled={submitting}
                  className={`mt-3 w-full rounded-lg py-3 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-red-500/30 focus:ring-offset-2 border border-red-600 text-red-700 hover:text-red-800 hover:border-red-700 ${
                    submitting
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  }`}
                  title="Cancel and return to home"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CircleX className="h-5 w-5" />
                    Cancel Booking
                  </div>
                </motion.button>
              </SectionCard>

              <SectionCard className="border-blue-200">
                <h4 className="font-bold text-blue-900 mb-1.5">
                  Important Notes
                </h4>
                <ul className="text-sm text-gray-700 space-y-1.5">
                  <li>• Arrive at the pickup point 15 minutes early</li>
                  <li>• Carry a valid ID for verification</li>
                  <li>• Seats confirmed only after payment</li>
                  <li>• Cancellation policy applies as per terms</li>
                </ul>
              </SectionCard>
            </div>
          </div>

          {/* Error State */}
          <AnimatePresence>
            {!isStateValid && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mt-6 flex items-center gap-2 rounded-lg border border-red-300 p-3"
              >
                <CircleX className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">
                    Incomplete Details
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    Some required information is missing. Please go back and
                    complete your booking details.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Minimal Confirm Sheet */}
      <AnimatePresence>
        {confirmUI.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center pt-20 bg-black/30"
            onClick={() => closeConfirm(false)}
          >
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              className="w-full max-w-md rounded-lg shadow-xl border border-gray-200 p-4 mx-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-base font-bold text-gray-900">
                {confirmUI.title}
              </div>
              {confirmUI.body && (
                <div className="mt-1.5 text-sm text-gray-700">
                  {confirmUI.body}
                </div>
              )}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => closeConfirm(false)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => closeConfirm(true)}
                  className="rounded-md bg-blue-900 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
