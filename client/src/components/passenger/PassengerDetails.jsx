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
  // Booking form (names are editable for siblings/relatives; phone is the verified user’s phone)
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

    toast.success("Session ready. You can complete passenger details.");
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
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      <h2 className="text-lg font-bold mb-4">👤 Passenger Details</h2>

      {/* Phone authentication (cookies, OTP, Firestore, Mongo ensure) */}
      <div className="border rounded-xl p-4 mb-4">
        <PhoneAuth
          initialCountryDial="+94"
          getNames={getNames}
          onVerified={handleVerified}
        />
        <p className="text-xs text-gray-500 mt-2 bg-[#F9FAFB] p-2 rounded border border-gray-200">
          You can book for siblings/relatives using their names below. The
          booking will be tied to your verified phone number.
        </p>
      </div>

      {/* Editable booking details (names editable; phone fixed via PhoneAuth) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="First Name"
          value={form.fname}
          onChange={setField("fname")}
          onBlur={onBlur("fname")}
          error={errors.fname}
        />
        <TextField
          label="Last Name"
          value={form.lname}
          onChange={setField("lname")}
          onBlur={onBlur("lname")}
          error={errors.lname}
        />

        <SelectField
          label="Pickup Point"
          value={form.pickup}
          onChange={setField("pickup")}
          onBlur={onBlur("pickup")}
          options={pickupOptions}
          error={errors.pickup}
        />
        <SelectField
          label="Drop Point"
          value={form.drop}
          onChange={setField("drop")}
          onBlur={onBlur("drop")}
          options={dropOptions}
          error={errors.drop}
        />

        <SelectField
          label="Payment Method"
          value={form.payment}
          onChange={setField("payment")}
          onBlur={onBlur("payment")}
          options={["Card", "Cash"]}
          error={errors.payment}
        />
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Seats: <strong>{seatsChosen.length}</strong> • Subtotal:{" "}
            <strong>LKR {Number(subtotal).toFixed(2)}</strong>
          </div>
          <button
            type="button"
            onClick={() => onProceed?.({ ...form })}
            disabled={!localCanProceed}
            className={`px-4 py-2.5 rounded-lg font-semibold text-white transition ${
              localCanProceed
                ? "bg-blue-900 hover:bg-blue-800"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Field controls ----------------------------- */
function TextField({ label, value, onChange, onBlur, error }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={label}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, onBlur, options = [], error }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </label>
      <select
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
