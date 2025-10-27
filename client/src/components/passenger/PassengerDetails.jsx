// src/pages/PassengerDetails.jsx
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import PhoneAuth from "../auth/PhoneAuth";
import { getPassengerByPhone } from "../../api/passenger";

export default function PassengerDetails({
  bus,
  travelDate, // kept for future use if needed
  selectedSeatGenders, // Map<number, "M" | "F" | null>
  subtotal,
  canProceed, // optional boolean from parent
  onProceed,
}) {
  // Booking form (names are editable for siblings/relatives; phone is the verified user's phone)
  const [form, setForm] = useState({
    fname: "",
    lname: "",
    phone: "", // E.164 from PhoneAuth
    pickup: "",
    drop: "",
    payment: "Card",
  });
  const [errors, setErrors] = useState({});

  /* ------------------------------ route options ------------------------------ */
  const pickups = useMemo(() => bus?.pickups?.map((p) => p.place) || [], [bus]);
  const routeFrom = bus?.route?.from || "";
  const routeTo = bus?.route?.to || "";

  const pickupOptions = useMemo(
    () => pickups.filter((p) => p !== routeTo),
    [pickups, routeTo]
  );
  const dropOptions = useMemo(
    () => pickups.filter((p) => p !== routeFrom),
    [pickups, routeFrom]
  );

  /* --------------------------- validation + helpers -------------------------- */
  const validators = {
    fname: (v) =>
      v && /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test((v || "").trim())
        ? ""
        : "Enter a valid first name.",
    lname: (v) =>
      v && /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test((v || "").trim())
        ? ""
        : "Enter a valid last name.",
    phone: (v) =>
      v && /^\+\d{6,15}$/.test(v) ? "" : "Verified phone is missing/invalid.",
    pickup: (v) => (!v ? "Select pickup point." : ""),
    drop: (v) => (!v ? "Select drop point." : ""),
    payment: (v) =>
      v === "Cash" || v === "Card" ? "" : "Choose a payment method.",
  };

  const setField = (field) => (e) => {
    const value = e.target?.value ?? e;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  };

  const onBlur = (field) => (e) => {
    const msg = validators[field]?.(e.target.value || "") || "";
    setErrors((er) => ({ ...er, [field]: msg }));
  };

  /* ----------------- seat gate (works with/without parent flag) ---------------- */
  const seatsChosen = useMemo(() => {
    if (
      !selectedSeatGenders ||
      typeof selectedSeatGenders.values !== "function"
    )
      return [];
    return Array.from(selectedSeatGenders.values()).filter(Boolean);
  }, [selectedSeatGenders]);

  const seatsOk =
    seatsChosen.length > 0 && seatsChosen.every((g) => g === "M" || g === "F");

  /* -------------------- PhoneAuth integration (verified user) ------------------- */
  // If PhoneAuth needs to create a new passenger, it will use these names initially.
  const getNames = () => ({ fname: form.fname, lname: form.lname });

  const handleVerified = async ({ phoneE164, role, passenger }) => {
    // Set the verified phone for booking
    setForm((f) => ({ ...f, phone: phoneE164 }));

    // Prefill names from existing passenger (keep fields editable)
    try {
      const existing = passenger || (await getPassengerByPhone(phoneE164));
      if (existing) {
        setForm((f) => ({
          ...f,
          fname: f.fname || existing.fname || "",
          lname: f.lname || existing.lname || "",
        }));
      }
    } catch {
      // if lookup fails, user can still type names
    }
  };

  /* --------------------------- final proceed gate --------------------------- */
  const validatorsState = {
    fname: validators.fname(form.fname),
    lname: validators.lname(form.lname),
    phone: validators.phone(form.phone),
    pickup: validators.pickup(form.pickup),
    drop: validators.drop(form.drop),
    payment: validators.payment(form.payment),
  };
  const allValid = Object.values(validatorsState).every((msg) => !msg);

  // If parent provided canProceed (boolean), use it; else fallback to seatsOk
  const seatGate = typeof canProceed === "boolean" ? canProceed : seatsOk;

  const localCanProceed = seatGate && allValid;

  /* --------------------------------- render --------------------------------- */
  return (
    <section
      className="
        rounded-xl p-6 mt-4 border border-gray-200 shadow-sm
        transition-transform duration-200 ease-out will-change-transform
        hover:shadow-md motion-safe:hover:-translate-y-0.5
      "
    >
      <div className="flex items-center mb-6">
        <div
          className="
            w-10 h-10 rounded-lg flex items-center justify-center mr-3
            bg-blue-900 text-white
          "
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Passenger Details</h2>
      </div>

      {/* Phone authentication (cookies, OTP, Firestore, Mongo ensure) */}
      <div className="rounded-xl p-5 mb-6 border border-gray-200">
        <PhoneAuth
          initialCountryDial="+94"
          getNames={getNames}
          onVerified={handleVerified}
        />
        <div className="mt-3 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-800 flex items-start">
            <svg
              className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-blue-900"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            You can book for siblings/relatives using their names below. The
            booking will be tied to your verified phone number.
          </p>
        </div>
      </div>

      {/* Editable booking details (names editable; phone fixed via PhoneAuth) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <TextField
          label="First Name"
          value={form.fname}
          onChange={setField("fname")}
          onBlur={onBlur("fname")}
          error={errors.fname}
          icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
        <TextField
          label="Last Name"
          value={form.lname}
          onChange={setField("lname")}
          onBlur={onBlur("lname")}
          error={errors.lname}
          icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />

        <SelectField
          label="Pickup Point"
          value={form.pickup}
          onChange={setField("pickup")}
          onBlur={onBlur("pickup")}
          options={pickupOptions}
          error={errors.pickup}
          icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <SelectField
          label="Drop Point"
          value={form.drop}
          onChange={setField("drop")}
          onBlur={onBlur("drop")}
          options={dropOptions}
          error={errors.drop}
          icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />

        {/* Payment — Card only (default) */}
        <SelectField
          label="Payment Method"
          value={form.payment}
          onChange={setField("payment")}
          onBlur={onBlur("payment")}
          options={["Card"]}
          error={errors.payment}
          icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </div>

      <div className="pt-5 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="px-4 py-3 rounded-lg border border-gray-200">
            <div className="flex items-center text-gray-800">
              <svg
                className="w-5 h-5 mr-2 text-blue-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">
                {seatsChosen.length}{" "}
                {seatsChosen.length === 1 ? "Seat" : "Seats"} •
                <span className="text-blue-900 ml-1">
                  LKR {Number(subtotal).toFixed(2)}
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onProceed?.({ ...form })}
            disabled={!localCanProceed}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900
              ${
                localCanProceed
                  ? "bg-blue-900 hover:bg-blue-900/90 shadow-sm hover:shadow-md motion-safe:hover:-translate-y-0.5"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
          >
            <span>Proceed to Checkout</span>
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Field controls ----------------------------- */
function TextField({ label, value, onChange, onBlur, error, icon }) {
  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={icon}
            />
          </svg>
        </div>
        <input
          type="text"
          className={`w-full rounded-lg border pl-10 pr-4 py-3
            text-gray-900 placeholder:text-gray-400
            focus:outline-none transition-all duration-200
            ${
              error
                ? "border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
      {error && (
        <div className="flex items-center mt-2 text-red-600">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  onBlur,
  options = [],
  error,
  icon,
}) {
  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={icon}
            />
          </svg>
        </div>
        <select
          className={`w-full rounded-lg border pl-10 pr-10 py-3 appearance-none
            text-gray-900
            focus:outline-none transition-all duration-200
            ${
              error
                ? "border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        {/* Fixed chevron on the right (stays “down”) */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {error && (
        <div className="flex items-center mt-2 text-red-600">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
