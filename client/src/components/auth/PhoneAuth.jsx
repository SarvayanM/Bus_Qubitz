// src/components/auth/PhoneAuth.jsx
import { useEffect, useMemo, useRef, useState, useContext } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

import RoleContext from "../../components/common/RoleContext";
import CountrySelect from "../../components/common/CountrySelect";

import auth, { db } from "../../services/firebaseAuth";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { getPassengerByPhone, createPassenger } from "../../api/passenger";

/**
 * PhoneAuth: Handles OTP login + user ensure + passenger ensure + session persistence.
 *
 * Props:
 * - initialCountryDial (default "+94")
 * - getNames?: () => ({ fname, lname })     // used ONLY when creating a new passenger
 * - onVerified: ({ phoneE164, role, passenger }) => void
 *      passenger is the MongoDB passenger (if found/created) or null
 * - className?: string  // layout wrapper classes
 */
export default function PhoneAuth({
  initialCountryDial = "+94",
  getNames,
  onVerified,
  className = "",
}) {
  const { setUserRole } = useContext(RoleContext);
  const [countryDial, setCountryDial] = useState(initialCountryDial);
  const [rawPhone, setRawPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const confirmationResultRef = useRef(null);

  /* ---------- bootstrap from cookies (phone + phone_verified) ---------- */
  useEffect(() => {
    const savedPhone = Cookies.get("phone");
    const verified = Cookies.get("phone_verified") === "true";

    if (savedPhone && /^\+\d{6,15}$/.test(savedPhone)) {
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
      const dial = knownDials
        .sort((a, b) => b.length - a.length)
        .find((d) => savedPhone.startsWith(d));
      if (dial) {
        setCountryDial(dial);
        setRawPhone(savedPhone.slice(dial.length));
      } else {
        setCountryDial(initialCountryDial);
        setRawPhone(savedPhone.replace(/^\+/, ""));
      }

      if (verified) {
        // Already verified session→ ensure passenger and notify parent
        (async () => {
          try {
            const role = localStorage.getItem("role") || "passenger";
            const passenger = await getPassengerByPhone(savedPhone).catch(
              () => null
            );
            setPhoneVerified(true);
            // Expose a simple global flag used by parent gate logic
            try {
              window.__phoneVerified = true;
            } catch {}
            onVerified?.({ phoneE164: savedPhone, role, passenger });
          } catch (_) {
            // ignore
          }
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------- OTP & Firebase helpers ----------------------- */
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

  const resetRecaptcha = () => {
    try {
      window.recaptchaVerifier?.clear?.();
    } catch {}
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "invisible" }
    );
  };

  const persistSession = (role, phoneE164) => {
    localStorage.setItem("role", role);
    localStorage.setItem("userPhone", phoneE164);
    Cookies.set("phone", phoneE164, { expires: 30 });
    Cookies.set("phone_verified", "true", { expires: 30 });
    setUserRole?.(role);
  };

  const ensureFirestoreUser = async (uid, phoneE164) => {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        phoneNumber: phoneE164,
        role: "passenger",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { role: "passenger", phoneNumber: phoneE164 };
    }
    const data = snap.data() || {};
    let { role, phoneNumber } = data;
    const patch = {};
    if (!role) patch.role = "passenger";
    if (!phoneNumber) patch.phoneNumber = phoneE164;
    if (Object.keys(patch).length) {
      patch.updatedAt = serverTimestamp();
      await updateDoc(ref, patch);
      role = patch.role || role;
      phoneNumber = patch.phoneNumber || phoneNumber;
    }
    return { role: role || "passenger", phoneNumber: phoneNumber || phoneE164 };
  };

  const sendOtp = async () => {
    const e164 = `${countryDial}${rawPhone.replace(/[^\d]/g, "")}`;
    if (!/^\+\d{6,15}$/.test(e164)) {
      toast.error("Enter a valid phone number.");
      return;
    }
    setSending(true);
    try {
      const verifier = ensureRecaptcha();
      const result = await signInWithPhoneNumber(auth, e164, verifier);
      confirmationResultRef.current = result;
      setOtpSent(true);
      toast.success("OTP sent!");
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/invalid-phone-number")
        toast.error("Invalid phone number.");
      else if (code === "auth/too-many-requests")
        toast.error("Too many attempts. Try later.");
      else if (code === "auth/quota-exceeded")
        toast.error("SMS quota exceeded. Try later.");
      else toast.error(e?.message || "Failed to send OTP.");
      resetRecaptcha();
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || !confirmationResultRef.current) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }
    setVerifying(true);
    try {
      const credential = await confirmationResultRef.current.confirm(otp);
      const user = credential.user;
      const phoneE164 = user.phoneNumber;

      // Ensure Firestore user (phoneNumber + role)
      const { role } = await ensureFirestoreUser(user.uid, phoneE164);

      // Ensure Mongo passenger (create only if absent)
      let passenger = await getPassengerByPhone(phoneE164).catch(() => null);
      if (!passenger) {
        const names = (typeof getNames === "function" ? getNames() : {}) || {};
        passenger = await createPassenger({
          phone: phoneE164,
          fname: names.fname || "",
          lname: names.lname || "",
        });
      }

      // Persist local session + cookies and lift up
      persistSession(role, phoneE164);
      setPhoneVerified(true);
      // Expose a simple global flag used by parent gate logic
      try {
        window.__phoneVerified = true;
      } catch {}
      toast.success("Phone verified!");
      onVerified?.({ phoneE164, role, passenger });
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/invalid-verification-code")
        toast.error("Invalid OTP.");
      else if (code === "auth/code-expired")
        toast.error("OTP expired. Please resend.");
      else toast.error(e?.message || "Verification failed.");
      resetRecaptcha();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={className}>
      {/* Invisible reCAPTCHA host */}
      <div id="recaptcha-container" />

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
              disabled={sending}
              className="w-full h-[38px] rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold transition disabled:opacity-70"
            >
              {sending ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
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
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={verifyOtp}
            disabled={verifying}
            className="rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold transition disabled:opacity-70"
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      )}
    </div>
  );
}
