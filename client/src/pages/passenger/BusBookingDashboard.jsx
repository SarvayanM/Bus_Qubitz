import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

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
        setBookedMale(new Set(data?.bookedMale || []));
        setBookedFemale(new Set(data?.bookedFemale || []));
        setBookedOther(new Set(data?.bookedOther || []));
        setUnavailableSeats(new Set(data?.unavailableSeats || []));
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
    sessionStorage.setItem("checkout-summary", JSON.stringify(payload));
    navigate("/checkout-summary", { state: payload });
  };

  // Theming container
  return (
    <div
      className="min-h-screen text-gray-900 pt-24 pb-10"
      style={{
        backgroundColor: "#ffffff",
        backgroundImage:
          "radial-gradient(circle at 20% 10%, rgba(29,78,216,0.06) 0, transparent 45%), radial-gradient(circle at 80% 0%, rgba(30,64,175,0.05) 0, transparent 40%), radial-gradient(circle at 50% 100%, rgba(29,78,216,0.06) 0, transparent 40%)",
      }}
    >
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header meta */}
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-blue-800">
              Bus Booking
            </span>
          </h1>
          {bus && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-2 bg-white text-gray-800 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <span>📍 From:</span>
                <strong>{bus?.route?.from || "-"}</strong>
              </span>
              <span className="inline-flex items-center gap-2 bg-white text-gray-800 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <span>🎯 To:</span>
                <strong>{bus?.route?.to || "-"}</strong>
              </span>
              <span className="inline-flex items-center gap-2 bg-white text-gray-800 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <span>📅 Date:</span>
                <strong>{travelDate || "-"}</strong>
              </span>
            </div>
          )}
        </header>

        {/* Loading / errors */}
        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-800 rounded-full animate-spin mx-auto mb-3" />
            <p className="font-semibold">Loading…</p>
          </div>
        )}
        {!loading && err && (
          <div className="max-w-2xl mx-auto rounded-xl p-6 border border-blue-100 bg-blue-50 text-center shadow-sm">
            <h3 className="text-lg font-bold mb-1">We couldn’t load the bus</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please check the link and try again.
            </p>
          </div>
        )}

        {!loading && !err && bus && (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left — Bus info (smaller) */}
            <div className="lg:col-span-4">
              <BusDetailsCard bus={bus} />
              <div className="mt-6">
                <SeatLayout
                  seatLayout={seatLayout}
                  seatStatus={seatStatus}
                  onToggle={toggleSeat}
                  onSetGender={setSeatGender}
                  onClearSeat={clearSeat}
                  selectedSeatGenders={selectedSeatGenders}
                />
              </div>
            </div>

            {/* Right — Passenger (larger) */}
            <div className="lg:col-span-8">
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
          </div>
        )}
      </div>
    </div>
  );
}

// simple gate for "can proceed": phone verified (flag stored by PassengerDetails)
function passengerOk(confirmationResultRef) {
  // PassengerDetails sets a window flag once verified
  return !!window.__phoneVerified;
}
