import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { MapPin, Clock, Tag, Bus as BusIcon, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import BusDetailsCard from "../../components/bus/BusDetailsCard";
import SeatLayout from "../../components/seats/SeatLayout";
import PassengerDetails from "../../components/passenger/PassengerDetails";
import { formatYMD } from "../../utils/date";
import { computeSeatLayout } from "../../utils/seatLayout";
import BusLoader from "../../components/bus/BusLoader";
import { getBusById } from "../../api/bus";
import { getBookingsByBusAndDate, createBooking } from "../../api/booking";
import { getPassengerByPhone, createPassenger } from "../../api/passenger";

export default function BusBookingDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const qFrom = (searchParams.get("from") || "").trim();
  const qTo = (searchParams.get("to") || "").trim();
  const qDate = (searchParams.get("date") || "").trim();
  const qId = (searchParams.get("busId") || "").trim();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [bus, setBus] = useState(null);
  const [travelDate, setTravelDate] = useState(qDate || formatYMD(new Date()));

  // State driven by bookings for selected date
  const [bookedMale, setBookedMale] = useState(new Set());
  const [bookedFemale, setBookedFemale] = useState(new Set());
  const [bookedOther, setBookedOther] = useState(new Set());
  const [unavailableSeats, setUnavailableSeats] = useState(new Set());

  // User selections
  // Map<number, "Male" | "Female" | "Other">
  const [selectedSeatGenders, setSelectedSeatGenders] = useState(new Map());

  // OTP refs for PassengerDetails
  const confirmationResultRef = useRef(null);

  // --------------------------------------------------------------------------
  // Fetch bus
  useEffect(() => {
    (async () => {
      try {
        if (!qId) {
          setErr("missing");
          setLoading(false);
          return;
        }
        setLoading(true);
        setErr("");
        const b = await getBusById(qId);
        if (!b) {
          setErr("notfound");
          setLoading(false);
          return;
        }
        setBus(b);
        // default the travelDate if invalid / past handled below
      } catch (e) {
        console.warn(e);
        setErr("load_failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [qId]);

  // Validate travel date (not in the past relative to today)
  useEffect(() => {
    if (!qDate) return;
    const today = formatYMD(new Date());
    if (qDate < today) {
      toast.error("Selected date is in the past. Showing today instead.");
      setTravelDate(today);
    } else {
      setTravelDate(qDate);
    }
  }, [qDate]);

  // Fetch bookings for this bus+date
  useEffect(() => {
    (async () => {
      if (!qId || !travelDate) return;
      try {
        const data = await getBookingsByBusAndDate(qId, travelDate);
        // API returns bookedByGents / bookedByLadies / unavailableSeats
        const toNums = (arr) =>
          new Set((arr || []).map((it) => Number(it?.number ?? it)));
        setBookedMale(toNums(data?.bookedByGents || data?.bookedMale || []));
        setBookedFemale(
          toNums(data?.bookedByLadies || data?.bookedFemale || [])
        );
        // Other bookings may not be provided by API; keep as empty set if missing
        setBookedOther(toNums(data?.bookedOther || []));
        setUnavailableSeats(
          toNums(data?.unavailableSeats || data?.unavailable || [])
        );
        setSelectedSeatGenders(new Map());
      } catch (e) {
        console.warn(e);
        // do not surface technical error
      }
    })();
  }, [qId, travelDate]);

  // Seat layout (2-2 + last row 5 seats; handle 51 seats with 2-right row)
  const seatLayout = useMemo(() => {
    if (!bus?.seats) return [];
    return computeSeatLayout(bus._id, Number(bus.seats));
  }, [bus]);

  // Status lookup
  const seatStatus = (num) => {
    if (unavailableSeats.has(num)) return "unavailable";
    if (bookedMale.has(num)) return "bookedMale";
    if (bookedFemale.has(num)) return "bookedFemale";
    if (bookedOther.has(num)) return "bookedOther";
    if (selectedSeatGenders.has(num)) return "selected"; // single green state
    return "available";
  };

  const isBlocked = (num) =>
    unavailableSeats.has(num) ||
    bookedMale.has(num) ||
    bookedFemale.has(num) ||
    bookedOther.has(num);

  // Toggle + gender chooser
  const toggleSeat = (num) => {
    if (isBlocked(num)) return;
    const next = new Map(selectedSeatGenders);
    if (next.has(num)) {
      next.delete(num);
    } else {
      // Add without gender first; gender popover inside SeatLayout will ask
      next.set(num, null);
    }
    setSelectedSeatGenders(next);
  };

  const setSeatGender = (num, gender) => {
    if (isBlocked(num)) return;
    const next = new Map(selectedSeatGenders);
    if (!next.has(num)) next.set(num, gender);
    else next.set(num, gender);
    setSelectedSeatGenders(next);
  };

  const clearSeat = (num) => {
    const next = new Map(selectedSeatGenders);
    next.delete(num);
    setSelectedSeatGenders(next);
  };

  const selectedSeatsArray = [...selectedSeatGenders.entries()]
    .filter(([, g]) => !!g)
    .map(([number, gender]) => ({ number, gender }));

  const canProceed =
    bus &&
    travelDate &&
    selectedSeatsArray.length > 0 &&
    passengerOk(confirmationResultRef);

  // subtotal
  const subtotal = (
    Number(bus?.price || 0) * selectedSeatsArray.length
  ).toFixed(2);

  const proceed = (passenger) => {
    if (!canProceed) {
      toast.error("Please complete all required fields.");
      return;
    }
    const payload = {
      from: bus?.route?.from,
      to: bus?.route?.to,
      date: travelDate,
      bus: {
        id: bus?._id,
        busNo: bus?.busNo,
        busName: bus?.busName,
        type: bus?.type,
        frequency: bus?.frequency,
        depart: bus?.schedule?.departure,
        pricePerSeat: Number(bus?.price || 0),
      },
      seats: selectedSeatsArray, // [{ number, gender }]
      passenger,
      pickup: passenger.pickup,
      drop: passenger.drop,
      payment: passenger.payment,
      total: Number(subtotal),
    };
    sessionStorage.setItem("checkoutSummary", JSON.stringify(payload));
    navigate("/checkoutSummary", { state: payload });
  };

  // ----------------------------- UI (Styling Only) -----------------------------
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Bus Booking Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select your seats and complete passenger details to proceed with
            your booking
          </p>
        </div>

        {/* Meta chips */}
        {bus && (
          <div
            className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3"
            role="list"
            aria-label="Trip details"
          >
            <MetaChip
              icon={<BusIcon className="h-4 w-4" aria-hidden="true" />}
              label="Bus"
              labelClass="text-blue-700"
              value={bus?.busName || bus?.bus_name || "-"}
            />
            <MetaChip
              icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
              label="From"
              labelClass="text-emerald-700"
              value={bus?.route?.from || "-"}
            />
            <MetaChip
              icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
              label="To"
              labelClass="text-rose-700"
              value={bus?.route?.to || "-"}
            />
            <MetaChip
              icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              label="Departure"
              labelClass="text-amber-700"
              value={bus?.schedule?.departure || bus?.departure || "-"}
            />
            <MetaChip
              icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
              label="Date"
              labelClass="text-indigo-700"
              value={travelDate || "-"}
            />
            <MetaChip
              icon={<Tag className="h-4 w-4" aria-hidden="true" />}
              label="Price"
              labelClass="text-fuchsia-700"
              value={
                bus?.price != null ? `LKR ${Number(bus.price).toFixed(2)}` : "-"
              }
            />
          </div>
        )}
      </div>

      {/* Loading / errors */}
      <AnimatePresence initial={false} mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm"
          >
            <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Loading…</p>
          </motion.div>
        )}

        {!loading && err && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="max-w-2xl mx-auto rounded-xl p-6 border border-blue-100 bg-white text-center shadow-sm "
          >
            <h3 className="text-lg font-bold mb-1 text-gray-900">
              We couldn’t load the bus
            </h3>
            <p className="text-sm text-gray-600">
              Please check the link and try again.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {!loading && !err && bus && (
        <div className="grid lg:grid-cols-12 gap-0 ml-16">
          {/* Left — Seat layout */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="lg:col-span-4 lg:pr-8 pb-6 lg:pb-0"
            aria-labelledby="seats-heading"
          >
            <Card>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Select Seats
                </h1>
                <p className="text-mt text-gray-600 max-w-2xl mx-auto">
                  Choose seat(s) and set passenger gender for each
                </p>
                        
              </div>
              <div className="mt-4 flex justify-center">
                <SeatLayout
                  seatLayout={seatLayout}
                  seatStatus={seatStatus}
                  onToggle={toggleSeat}
                  onSetGender={setSeatGender}
                  onClearSeat={clearSeat}
                  selectedSeatGenders={selectedSeatGenders}
                />
              </div>
            </Card>
          </motion.section>

          {/* Right — Passenger details */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 24,
              delay: 0.03,
            }}
            className="lg:col-span-8 lg:pl-8 pb-6 lg:pb-0"
            aria-labelledby="passenger-heading"
          >
            <Card className="h-full">
              <CardHeader
                id="passenger-heading"
                title="Passenger Details"
                subtitle="Enter contact info, pickup/drop, and confirm your booking."
              />
              <div className="mt-4">
                <PassengerDetails
                  bus={bus}
                  travelDate={travelDate}
                  selectedSeatGenders={selectedSeatGenders}
                  subtotal={subtotal}
                  canProceed={canProceed}
                  onProceed={proceed}
                  confirmationResultRef={confirmationResultRef}
                />
              </div>
            </Card>
          </motion.section>
        </div>
      )}
    </div>
  );
}

// simple gate for "can proceed": phone verified (flag stored by PassengerDetails)
function passengerOk(confirmationResultRef) {
  // PassengerDetails sets a window flag once verified
  return !!window.__phoneVerified;
}

/* ----------------------------- UI Helpers ----------------------------- */

function MetaChip({ icon, label, value, labelClass = "" }) {
  return (
    <div
      role="listitem"
      className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md focus-within:ring-2 focus-within:ring-blue-900"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-500 group-hover:text-blue-900 transition">
          {icon}
        </span>
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${labelClass}`}
        >
          {label}
        </span>
      </div>
      <div className="truncate text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ id, title, subtitle }) {
  return (
    <header id={id} className="flex items-start justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </header>
  );
}
