// src/pages/PassengerDetails.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

import CountrySelect from "../common/CountrySelect";
import { getPassengerByPhone, createPassenger } from "../../api/passenger";

import auth from "../../services/firebaseAuth";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

export default function PassengerDetails({
  bus,
  travelDate,
  selectedSeatGenders,
  subtotal,
  canProceed,
  onProceed,
}) {
  const [countryDial, setCountryDial] = useState("+94");
  const [rawPhone, setRawPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const confirmationResultRef = useRef(null);

  // Minimal passenger fields (gender removed)
  const [form, setForm] = useState({
    fname: "",
    lname: "",
    phone: "", // E.164
    pickup: "",
    drop: "",
    payment: "Card",
  });
  const [errors, setErrors] = useState({});

  const pickups = useMemo(() => bus?.pickups?.map((p) => p.place) || [], [bus]);
  const routeFrom = bus?.route?.from || "";
  const routeTo = bus?.route?.to || "";

  const pickupOptions = useMemo(
    () => pickups.filter((p) => p !== routeTo), // don't show destination as pickup
    [pickups, routeTo]
  );
  const dropOptions = useMemo(
    () => pickups.filter((p) => p !== routeFrom), // don't show origin as drop
    [pickups, routeFrom]
  );

  /* -------------------------- validation helpers -------------------------- */
  const validators = {
    fname: (v) =>
      v && /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(v.trim())
        ? ""
        : "Enter a valid first name.",
    lname: (v) =>
      v && /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(v.trim())
        ? ""
        : "Enter a valid last name.",
    phone: (v) =>
      v && /^\+\d{6,15}$/.test(v)
        ? ""
        : "Enter a valid phone number with country code.",
    pickup: (v) => (!v ? "Select pickup point." : ""),
    drop: (v) => (!v ? "Select drop point." : ""),
    payment: (v) =>
      v === "Cash" || v === "Card" ? "" : "Choose a payment method.",
  };

  const setField = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  };
  const onBlur = (field) => (e) => {
    const msg = validators[field]?.(e.target.value || "") || "";
    setErrors((er) => ({ ...er, [field]: msg }));
  };

  /* ------------------- cookie bootstrap (prefill if any) ------------------ */
  useEffect(() => {
    const savedPhone = Cookies.get("phone");
    const verified = Cookies.get("phone_verified") === "true";

    if (savedPhone && /^\+\d{6,15}$/.test(savedPhone)) {
      // Try to infer country dial and local part to prefill inputs
      // (We only split if the CountrySelect expects separate dial + local)
      // Fallback: keep the entire local part in rawPhone
      const knownDials = [
        "+94",
        "+91",
        "+44",
        "+1",
        "+61",
        "+971",
        "+65",
        "+60",
        "+49",
        "+33",
        "+81",
        "+86",
        "+977",
        "+880",
      ];
      // pick the longest matching dial
      const dial = knownDials
        .sort((a, b) => b.length - a.length)
        .find((d) => savedPhone.startsWith(d));
      if (dial) {
        setCountryDial(dial);
        setRawPhone(savedPhone.slice(dial.length));
      } else {
        setCountryDial("+94");
        setRawPhone(savedPhone.replace(/^\+/, ""));
      }

      setForm((f) => ({ ...f, phone: savedPhone }));

      if (verified) {
        setPhoneVerified(true);
        // load passenger profile into form
        (async () => {
          try {
            const existing = await getPassengerByPhone(savedPhone);
            if (existing) {
              setForm((prev) => ({
                ...prev,
                fname: existing.fname || "",
                lname: existing.lname || "",
              }));
            }
          } catch {
            /* silent */
          }
        })();
      }
    }
  }, []);

  /* ----------------------- Firebase OTP integration ----------------------- */
  const ensureRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
    return window.recaptchaVerifier;
  };

  const sendOtp = async () => {
    const e164 = `${countryDial}${rawPhone.replace(/[^\d]/g, "")}`;
    if (!/^\+\d{6,15}$/.test(e164)) {
      toast.error("Enter a valid phone number.");
      return;
    }
    try {
      const verifier = ensureRecaptcha();
      const result = await signInWithPhoneNumber(auth, e164, verifier);
      confirmationResultRef.current = result;
      setOtpSent(true);
      setForm((f) => ({ ...f, phone: e164 })); // keep in form
      toast.success("OTP sent!");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    if (!otp || !confirmationResultRef.current) return;
    try {
      await confirmationResultRef.current.confirm(otp);
      setPhoneVerified(true);
      Cookies.set("phone", form.phone, { expires: 30 }); // 30 days
      Cookies.set("phone_verified", "true", { expires: 30 });
      toast.success("Phone verified!");

      // load or create passenger profile
      try {
        const existing = await getPassengerByPhone(form.phone);
        if (existing) {
          setForm((prev) => ({
            ...prev,
            fname: existing.fname || "",
            lname: existing.lname || "",
          }));
          toast.success("Passenger profile loaded.");
        } else {
          await createPassenger({
            phone: form.phone,
            fname: "",
            lname: "",
          });
          toast.success("Passenger created. Please complete details.");
        }
      } catch (dbErr) {
        console.warn("Passenger fetch/create failed:", dbErr);
      }
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Invalid OTP");
    }
  };

  /* ------------------------------ proceed gate ---------------------------- */
  const localCanProceed =
    canProceed &&
    phoneVerified &&
    !Object.values({
      fname: validators.fname(form.fname),
      lname: validators.lname(form.lname),
      phone: validators.phone(form.phone),
      pickup: validators.pickup(form.pickup),
      drop: validators.drop(form.drop),
      payment: validators.payment(form.payment),
    }).some(Boolean);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="recaptcha-container" />

      <h2 className="text-lg font-bold mb-4">👤 Passenger Details</h2>

      {/* Phone verification */}
      <div className="border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr_120px] gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Country
            </label>
            <CountrySelect
              value={countryDial}
              onChange={setCountryDial}
              disabled={phoneVerified}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-700">
                {countryDial}
              </span>
              <input
                type="tel"
                className="w-full rounded-r-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="77 123 4567"
                value={rawPhone}
                onChange={(e) => setRawPhone(e.target.value)}
                disabled={phoneVerified}
              />
            </div>
          </div>

          <div className="flex items-end">
            {!phoneVerified ? (
              <button
                type="button"
                onClick={sendOtp}
                className="w-full h-[38px] rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold transition"
              >
                {otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            ) : (
              <div className="w-full h-[38px] rounded-lg bg-green-600 text-white font-semibold flex items-center justify-center">
                Verified
              </div>
            )}
          </div>
        </div>

        {!phoneVerified && otpSent && (
          <div className="grid grid-cols-[1fr_120px] gap-3 mt-3">
            <input
              type="text"
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              type="button"
              onClick={verifyOtp}
              className="rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold transition"
            >
              Verify OTP
            </button>
          </div>
        )}
      </div>

      {/* Details */}
      <fieldset
        className={`${!phoneVerified ? "opacity-60" : ""}`}
        disabled={!phoneVerified}
      >
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
      </fieldset>

      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Seats:{" "}
            <strong>
              {[...selectedSeatGenders.entries()].filter(([, g]) => !!g).length}
            </strong>{" "}
            • Subtotal: <strong>LKR {Number(subtotal).toFixed(2)}</strong>
          </div>
          <button
            type="button"
            onClick={() => onProceed({ ...form })}
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
