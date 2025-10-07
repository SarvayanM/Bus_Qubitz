// src/pages/BusBookingDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import { getBuses, getBusById } from "../api/bus";
import { createBooking, getBookingsByBusAndDate } from "../api/booking";
import { createPassenger, getPassengerByEmail } from "../api/passenger";
import { sendWhatsAppMessage } from "../api/whatsappApi";

/* --------------------------------- helpers -------------------------------- */
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

/* --------------------------- main page component -------------------------- */
export default function BusBookingDashboard() {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [buses, setBuses] = useState([]);
  const [busId, setBusId] = useState("");
  const [travelDate, setTravelDate] = useState("");

  const [passenger, setPassenger] = useState(null);
  const [email, setEmail] = useState("");

  // derived bus details
  const [route, setRoute] = useState("");
  const [depart, setDepart] = useState("");
  const [pricePerSeat, setPricePerSeat] = useState(0);
  const [totalSeats, setTotalSeats] = useState(0);
  const [pickups, setPickups] = useState([]);
  const [frequency, setFrequency] = useState("");

  // seat status
  const [bookedGents, setBookedGents] = useState(new Set());
  const [bookedLadies, setBookedLadies] = useState(new Set());
  const [unavailableSeats, setUnavailableSeats] = useState(new Set());
  const [selected, setSelected] = useState(new Set());

  // form
  const [form, setForm] = useState({
    email: "",
    fname: "",
    lname: "",
    phone: "",
    gender: "",
    pickup: "",
    drop: "",
    payment: "Card",
  });
  const [errors, setErrors] = useState({
    fname: "",
    lname: "",
    phone: "",
    gender: "",
    pickup: "",
    drop: "",
    travelDate: "",
  });

  /* --------------------------------- effects -------------------------------- */
  // get logged-in email (cookie)
  useEffect(() => {
    setEmail(Cookies.get("email") || "");
  }, []);

  // load buses (for the select)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getBuses();
        if (!mounted) return;
        setBuses(Array.isArray(list) ? list : []);
      } catch (e) {
        setErr(e?.message || "Failed to load buses");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // pick up busId from query string (?busId=...)
  useEffect(() => {
    const q = searchParams.get("busId");
    if (q) setBusId(q);
  }, [searchParams]);

  // fetch passenger profile by email (prefill form)
  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const p = await getPassengerByEmail(email);
        if (p) {
          setPassenger(p);
          setForm((prev) => ({
            ...prev,
            email: p.email,
            fname: p.fname,
            lname: p.lname,
            phone: p.phone,
            gender: p.gender,
          }));
        } else {
          setForm((prev) => ({ ...prev, email }));
        }
      } catch {
        // silent fail into manual form entry
      }
    })();
  }, [email]);

  // hydrate bus details when busId changes
  useEffect(() => {
    if (!busId) {
      clearHydrated();
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const b = await getBusById(busId);
        if (!mounted || !b) return;

        setRoute(`${b?.route?.from || ""} → ${b?.route?.to || ""}`);
        setDepart(b?.schedule?.departure || "");
        setPricePerSeat(Number(b?.price || 0));
        setTotalSeats(Number(b?.seats || 0));
        setPickups(Array.isArray(b?.pickups) ? b.pickups : []);
        setFrequency(b?.frequency || "");
        setUnavailableSeats(new Set(b?.unavailable || []));
        setSelected(new Set());
      } catch (e) {
        setErr(e?.message || "Failed to load bus details");
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId]);

  // fetch bookings for a given bus + date
  useEffect(() => {
    if (!busId || !travelDate) return;
    let mounted = true;
    (async () => {
      try {
        const bookingData = await getBookingsByBusAndDate(busId, travelDate);
        if (!mounted) return;
        setBookedGents(new Set(bookingData?.bookedByGents || []));
        setBookedLadies(new Set(bookingData?.bookedByLadies || []));
        setUnavailableSeats(new Set(bookingData?.unavailableSeats || []));
        setSelected(new Set());
      } catch (e) {
        setErr(e?.message || "Failed to load bookings");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [busId, travelDate]);

  function clearHydrated() {
    setRoute("");
    setDepart("");
    setPricePerSeat(0);
    setTotalSeats(0);
    setPickups([]);
    setFrequency("");
    setSelected(new Set());
    setBookedGents(new Set());
    setBookedLadies(new Set());
    setUnavailableSeats(new Set());
  }

  /* --------------------------------- derived -------------------------------- */
  const minDate = useMemo(() => {
    const today = new Date();
    const todayStr = todayYmd();
    if (!depart) return todayStr;
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const depMinutes = toMinutes(depart);
    const TWO_HOURS = 120;
    return depMinutes !== null && depMinutes - nowMinutes < TWO_HOURS
      ? addDaysYmd(today, 1)
      : todayStr;
  }, [depart]);

  const seatLayout = useMemo(() => {
    if (!busId || !totalSeats) return [];
    const rows = [];
    let remaining = totalSeats;
    let next = 1;
    while (remaining > 5) {
      rows.push({
        row: rows.length + 1,
        seats: [
          { number: next++, side: "left" },
          { number: next++, side: "left" },
          { number: next++, side: "right" },
          { number: next++, side: "right" },
        ],
        isLastRow: false,
      });
      remaining -= 4;
    }
    const last = [];
    for (let i = 0; i < remaining; i++) last.push({ number: next++ });
    rows.push({ row: rows.length + 1, seats: last, isLastRow: true });
    return rows;
  }, [busId, totalSeats]);

  const fromTerminal = useMemo(
    () => route.split("→")[0]?.trim() || "",
    [route]
  );
  const toTerminal = useMemo(() => route.split("→")[1]?.trim() || "", [route]);

  const pickupOptions = useMemo(() => {
    const all = (pickups || []).map((p) => p.place);
    return all.filter((p) => p !== toTerminal);
  }, [pickups, toTerminal]);

  const dropOptions = useMemo(() => {
    const set = new Set((pickups || []).map((p) => p.place));
    if (toTerminal) set.add(toTerminal);
    set.delete(fromTerminal);
    return [...set];
  }, [pickups, toTerminal, fromTerminal]);

  // seat helpers
  const getSeatStatus = (num) => {
    if (unavailableSeats.has(num)) return "unavailable";
    if (bookedGents.has(num)) return "bookedGent";
    if (bookedLadies.has(num)) return "bookedLady";
    if (selected.has(num)) return "selected";
    return "available";
  };
  const isBlocked = (num) =>
    unavailableSeats.has(num) || bookedGents.has(num) || bookedLadies.has(num);

  const toggleSeat = (num) => {
    if (!busId || !travelDate || isBlocked(num)) return;
    const next = new Set(selected);
    next.has(num) ? next.delete(num) : next.add(num);
    setSelected(next);
  };

  const subtotal = [...selected].length * pricePerSeat;

  /* ------------------------------- validation ------------------------------- */
  const validators = {
    fname: (v) =>
      !v
        ? ""
        : /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(v.trim())
        ? ""
        : "Enter a valid first name.",
    lname: (v) =>
      !v
        ? ""
        : /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(v.trim())
        ? ""
        : "Enter a valid last name.",
    phone: (v) =>
      !v
        ? ""
        : /^\+94\d{9}$/.test(v)
        ? ""
        : "Phone must start with +94 and have 9 digits after it.",
    gender: (v) =>
      !v ? "" : v === "Male" || v === "Female" ? "" : "Select Male or Female.",
    pickup: (v) => {
      if (!v) return "";
      if (v === toTerminal) return "Pickup cannot be destination terminal.";
      if (v && form.drop && v === form.drop)
        return "Pickup and Drop cannot be the same.";
      return "";
    },
    drop: (v) => {
      if (!v) return "";
      if (v === fromTerminal) return "Drop cannot be origin terminal.";
      if (v && form.pickup && v === form.pickup)
        return "Pickup and Drop cannot be the same.";
      return "";
    },
    travelDate: (v) =>
      !v
        ? ""
        : v < minDate
        ? "Choose a valid date (today may be disabled if < 2h to depart)."
        : "",
  };

  const handleBlur = (field) => (e) => {
    const value = e.target.value;
    const msg = validators[field]?.(value) || "";
    setErrors((er) => ({ ...er, [field]: msg }));
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (!value && errors[field]) {
      setErrors((er) => ({ ...er, [field]: "" }));
    }
  };

  const handleDateChange = (e) => {
    const v = e.target.value;
    setTravelDate(v);
    setErrors((er) => ({
      ...er,
      travelDate: v ? validators.travelDate(v) : "",
    }));
  };

  const hardRequiredOk =
    busId &&
    travelDate &&
    selected.size > 0 &&
    form.fname.trim() &&
    form.lname.trim() &&
    form.phone &&
    form.gender &&
    form.pickup &&
    form.drop;

  const noVisibleErrors =
    !errors.fname &&
    !errors.lname &&
    !errors.phone &&
    !errors.gender &&
    !errors.pickup &&
    !errors.drop &&
    !errors.travelDate;

  const canProceed = hardRequiredOk && noVisibleErrors;

  /* ---------------------------- confirm booking ---------------------------- */
  const handleConfirmBooking = async () => {
    try {
      const bookingPayload = {
        email,
        busId,
        travelDate,
        seats: [...selected],
        passenger: {
          fname: form.fname,
          lname: form.lname,
          phone: form.phone,
          gender: form.gender,
        },
        pickup: form.pickup,
        drop: form.drop,
        payment: form.payment || "Card",
      };

      // 1) Create booking
      const bookingRes = await createBooking(bookingPayload); // <-- capture result
      toast.success("Booking confirmed successfully!");

      // 2) Fire-and-forget WhatsApp (don't block success if it fails)
      try {
        // Try to find a bus name from response or local list as fallback
        const busName =
          bookingRes?.bus?.busName ||
          bookingRes?.busName ||
          buses?.find((b) => b._id === busId)?.busName ||
          "N/A";

        const p = bookingPayload.passenger;
        const message =
          `✅ Booking Confirmed!\n` +
          `Bus: ${busName}\n` +
          `Travel Date: ${bookingPayload.travelDate}\n` +
          `Seats: ${
            bookingPayload.seats?.length ? bookingPayload.seats.join(", ") : "-"
          }\n` +
          `Passenger: ${p.fname} ${p.lname} (${p.gender})\n` +
          `Phone: ${p.phone}\n` +
          `Pickup: ${bookingPayload.pickup}\n` +
          `Drop: ${bookingPayload.drop}\n` +
          `Payment: ${bookingPayload.payment}`;
        console.log(p.phone);
        await sendWhatsAppMessage({
          to: (p.phone || "").trim(), // e.g. "+94771234567"
          message,
        });
      } catch (waErr) {
        console.warn("WhatsApp send failed:", waErr);
        // optional toast: toast.error("Couldn't send WhatsApp message.");
      }

      // 3) Update local seat maps by gender
      if (form.gender === "Male") {
        setBookedGents((prev) => new Set([...prev, ...selected]));
      } else if (form.gender === "Female") {
        setBookedLadies((prev) => new Set([...prev, ...selected]));
      }

      // 4) Create passenger record if new
      if (!passenger) {
        const passengerPayload = {
          email,
          fname: form.fname,
          lname: form.lname,
          phone: form.phone,
          gender: form.gender,
        };
        try {
          await createPassenger(passengerPayload);
          toast.success("Passenger created successfully!");
          setPassenger(passengerPayload);
        } catch (cpErr) {
          console.warn("Create passenger failed:", cpErr);
        }
      }

      // 5) Reset selection
      setSelected(new Set());
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Booking failed, please try again."
      );
    }
  };

  /* ------------------------------------ UI ---------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2563EB]/10 to-[#16A34A]/10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#2563EB]/20 px-8 py-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Loading buses...</span>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2563EB]/10 to-[#16A34A]/10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-red-200 px-8 py-6 shadow-lg max-w-md text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-700">{err}</p>
        </div>
      </div>
    );
  }

  const selectedBus = buses.find((b) => b._id === busId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2563EB]/10 to-[#16A34A]/10 py-8 mt-12">
      <Toaster />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 drop-shadow-md">
            Bus Booking Dashboard
          </h1>
          <p className="text-gray-800 text-lg drop-shadow-sm">
            Book your journey with ease and comfort
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left side */}
          <section className="lg:col-span-2">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-[#2563EB]/20 shadow-lg p-6">
              {/* Step 1: Bus + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Bus
                  </label>
                  <select
                    className="w-full rounded-lg border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                    value={busId}
                    onChange={(e) => setBusId(e.target.value)}
                  >
                    <option value="">Choose a bus...</option>
                    {buses.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.busName} — {b.route?.from} → {b.route?.to} ({b.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Travel Date
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    className="w-full rounded-lg border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                    value={travelDate}
                    onChange={handleDateChange}
                    onBlur={handleBlur("travelDate")}
                  />
                  {errors.travelDate && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.travelDate}
                    </p>
                  )}
                </div>
              </div>

              {!(busId && travelDate) ? (
                <div className="text-center py-12 border-2 border-dashed border-[#2563EB]/20 rounded-xl bg-[#F9FAFB]">
                  <div className="text-gray-600 text-lg font-medium mb-2">
                    Select a Bus and Travel Date
                  </div>
                  <p className="text-gray-500 text-sm">
                    Choose your preferred bus and travel date to view available
                    seats
                  </p>
                </div>
              ) : (
                <>
                  <Legend />

                  {/* Pickups quick view */}
                  {pickups?.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Pick-up Points
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pickups.map((p, i) => (
                          <div
                            key={`${p.place}-${p.time}-${i}`}
                            className="bg-[#F9FAFB] border border-[#2563EB]/20 rounded-lg px-4 py-3 flex justify-between items-center"
                          >
                            <span className="font-medium text-gray-900">
                              {p.place}
                            </span>
                            <span className="text-[#2563EB] font-semibold">
                              {p.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seat map */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Select Your Seats
                    </h3>

                    {/* Driver */}
                    <div className="mb-8 text-center">
                      <div className="bg-[#F9FAFB] border border-[#2563EB]/20 rounded-xl py-4 px-6 inline-block">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Driver
                        </div>
                        <div className="w-24 h-8 bg-gray-300 rounded mx-auto" />
                      </div>
                    </div>

                    {/* Grid */}
                    <div className="space-y-6">
                      {seatLayout.map((rowData) => (
                        <div
                          key={rowData.row}
                          className={`flex items-center gap-6 ${
                            rowData.isLastRow ? "justify-center" : ""
                          }`}
                        >
                          {!rowData.isLastRow ? (
                            <>
                              <div className="flex gap-3">
                                {rowData.seats
                                  .filter((s) => s.side === "left")
                                  .map((seat) => (
                                    <SeatButton
                                      key={seat.number}
                                      number={seat.number}
                                      status={getSeatStatus(seat.number)}
                                      onToggle={toggleSeat}
                                    />
                                  ))}
                              </div>

                              <div className="flex-1 min-w-[60px] bg-[#F9FAFB] h-1 rounded" />

                              <div className="flex gap-3">
                                {rowData.seats
                                  .filter((s) => s.side === "right")
                                  .map((seat) => (
                                    <SeatButton
                                      key={seat.number}
                                      number={seat.number}
                                      status={getSeatStatus(seat.number)}
                                      onToggle={toggleSeat}
                                    />
                                  ))}
                              </div>
                            </>
                          ) : (
                            <div className="flex gap-3">
                              {rowData.seats.map((seat) => (
                                <SeatButton
                                  key={seat.number}
                                  number={seat.number}
                                  status={getSeatStatus(seat.number)}
                                  onToggle={toggleSeat}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Passenger details */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Passenger Details
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {selected.size === 0
                        ? "Select at least one seat to enter details."
                        : `Selected ${selected.size} seat(s): ${[
                            ...selected,
                          ].join(", ")}`}
                    </p>

                    <fieldset
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      disabled={selected.size === 0}
                    >
                      {/* text inputs */}
                      {[
                        { label: "First Name", field: "fname", type: "text" },
                        { label: "Last Name", field: "lname", type: "text" },
                        {
                          label: "Phone (+94xxxxxxxxx)",
                          field: "phone",
                          type: "tel",
                        },
                      ].map(({ label, field, type }) => (
                        <div key={field}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {label}
                          </label>
                          <input
                            type={type}
                            className="w-full rounded-lg border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                            value={form[field] || ""}
                            onChange={handleChange(field)}
                            onBlur={handleBlur(field)}
                            placeholder={label}
                          />
                          {errors[field] && (
                            <p className="text-red-600 text-xs mt-1">
                              {errors[field]}
                            </p>
                          )}
                        </div>
                      ))}
                      {/* selects */}
                      {[
                        {
                          label: "Gender",
                          field: "gender",
                          options: ["Male", "Female"],
                        },
                        {
                          label: "Payment Method",
                          field: "payment",
                          options: ["Cash", "Card"],
                        },
                        {
                          label: "Pickup Point",
                          field: "pickup",
                          options: pickupOptions,
                        },
                        {
                          label: "Drop Point",
                          field: "drop",
                          options: dropOptions,
                        },
                      ].map(({ label, field, options }) => (
                        <div key={field}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {label}
                          </label>
                          <select
                            className="w-full rounded-lg border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                            value={form[field] || ""}
                            onChange={handleChange(field)}
                            onBlur={handleBlur(field)}
                          >
                            <option value="">Select {label}</option>
                            {options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          {errors[field] && (
                            <p className="text-red-600 text-xs mt-1">
                              {errors[field]}
                            </p>
                          )}
                        </div>
                      ))}
                    </fieldset>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Right: Summary */}
          {busId && (
            <aside className="lg:col-span-1">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-[#2563EB]/20 shadow-lg p-6 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Booking Summary
                </h2>

                <div className="space-y-4">
                  <SummaryRow
                    label="Bus"
                    value={`${selectedBus?.busNo || ""} (${
                      selectedBus?.type || "-"
                    })`}
                  />
                  <SummaryRow label="Route" value={route || "-"} />
                  <SummaryRow label="Departure" value={depart || "-"} />
                  <SummaryRow label="Frequency" value={frequency || "-"} />
                  <SummaryRow label="Travel Date" value={travelDate || "-"} />
                  <SummaryRow
                    label="Price per seat"
                    value={`LKR ${pricePerSeat.toFixed(2)}`}
                  />
                  <SummaryRow label="Seats selected" value={selected.size} />
                  {selected.size > 0 && (
                    <SummaryRow
                      label="Seat numbers"
                      value={[...selected].join(", ")}
                    />
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Passenger Info
                    </h3>
                    <SummaryRow
                      label="Name"
                      value={`${form.fname} ${form.lname}`.trim() || "-"}
                    />
                    <SummaryRow label="Phone" value={form.phone || "-"} />
                    <SummaryRow label="Gender" value={form.gender || "-"} />
                    <SummaryRow label="Pickup" value={form.pickup || "-"} />
                    <SummaryRow label="Drop" value={form.drop || "-"} />
                    <SummaryRow label="Payment" value={form.payment || "-"} />
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                      <span>Total Amount</span>
                      <span>LKR {subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canProceed}
                  onClick={() =>
                    toast.custom((t) => (
                      <div className="rounded-xl border bg-white p-4 shadow-xl w-[340px]">
                        <h3 className="text-lg font-semibold mb-2">
                          Confirm Booking
                        </h3>
                        <p className="text-sm text-gray-700 mb-4">
                          Are you sure you want to confirm booking for{" "}
                          <strong>{selected.size}</strong> seat(s) on{" "}
                          <strong>{selectedBus?.busNo}</strong>?
                        </p>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-4 py-2 rounded-lg border text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              toast.dismiss(t.id);
                              await handleConfirmBooking();
                            }}
                            className="px-4 py-2 rounded-lg bg-[#16A34A] text-white text-sm"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    ))
                  }
                  className={`w-full mt-6 py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                    canProceed
                      ? "bg-[#16A34A] hover:bg-[#138535] shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Proceed to Checkout
                </button>

                {!canProceed && (
                  <p className="text-red-600 text-xs mt-2 text-center">
                    Please complete all required fields correctly
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Seat button widget --------------------------- */
function SeatButton({ number, status, onToggle }) {
  const palette = {
    available:
      "bg-white border border-[#2563EB] text-gray-900 hover:bg-[#2563EB] hover:text-white",
    selected: "bg-[#16A34A] border border-[#16A34A] text-white",
    bookedGent:
      "bg-[#2563EB] border border-[#2563EB] text-white cursor-not-allowed",
    bookedLady:
      "bg-pink-500 border border-pink-500 text-white cursor-not-allowed",
    unavailable:
      "bg-gray-700 border border-gray-700 text-white cursor-not-allowed",
  };
  const cls = palette[status] || palette.available;
  const disabled = status !== "available" && status !== "selected";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(number)}
      className={`w-12 h-12 rounded-lg font-semibold transition-all flex items-center justify-center ${cls}`}
    >
      {number}
    </button>
  );
}

/* --------------------------------- Legend --------------------------------- */
function Legend() {
  const items = [
    { label: "Available", color: "bg-white border border-[#2563EB]" },
    { label: "Selected", color: "bg-[#16A34A]" },
    { label: "Booked (Male)", color: "bg-[#2563EB]" },
    { label: "Booked (Female)", color: "bg-pink-500" },
    { label: "Unavailable", color: "bg-gray-700" },
  ];
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Seat Legend</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`inline-block w-4 h-4 rounded ${item.color}`} />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Summary row ------------------------------- */
function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900 text-right break-words">
        {value ?? "-"}
      </span>
    </div>
  );
}
