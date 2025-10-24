import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
} from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import auth, { db } from "../../services/firebaseAuth";
import {
  getDoc,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import RoleContext from "../../components/common/RoleContext";
import { toE164 } from "../../utils/phone";
import { FiSmartphone, FiShield, FiRotateCw } from "react-icons/fi";
import { HiOutlineLockClosed } from "react-icons/hi";
import COUNTRIES from "../../data/countries";

const DEFAULT_ROLE = "passenger";
const USERS_COLLECTION = "users";

function Login() {
  const navigate = useNavigate();
  const { setUserRole } = useContext(RoleContext);

  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+94");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("enterPhone"); // 'enterPhone' | 'enterOtp'
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // cooldown countdown
  useEffect(() => {
    if (!resendCooldown) return;
    const id = setInterval(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(id);
  }, [resendCooldown]);

  const notify = (message, type = "error") =>
    toast[type](message, {
      position: "top-center",
      autoClose: 3000,
      pauseOnHover: true,
      draggable: true,
      theme: "colored",
    });

  // Initialize invisible reCAPTCHA once, and watch auth state
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
      );
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/home");
    });
    return () => unsub();
  }, [navigate]);

  const persistSession = (role, phoneE164) => {
    localStorage.setItem("role", role);
    localStorage.setItem("userPhone", phoneE164);
    document.cookie = `phone=${encodeURIComponent(
      phoneE164
    )}; path=/; max-age=${7 * 24 * 60 * 60}; Secure; SameSite=Strict`;
    setUserRole(role);
  };

  // Ensure Firestore user doc has phoneNumber & role; create or patch as needed.
  const ensureUserDocument = async (uid, phoneE164) => {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const role = DEFAULT_ROLE;
      await setDoc(userRef, {
        uid,
        phoneNumber: phoneE164,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { role, phoneNumber: phoneE164 };
    }

    const data = snap.data() || {};
    let { role, phoneNumber } = data;

    const updates = {};
    if (!role) updates.role = DEFAULT_ROLE;
    if (!phoneNumber) updates.phoneNumber = phoneE164;
    if (Object.keys(updates).length) {
      updates.updatedAt = serverTimestamp();
      await updateDoc(userRef, updates);
      role = updates.role || role;
      phoneNumber = updates.phoneNumber || phoneNumber;
    }

    return {
      role: role || DEFAULT_ROLE,
      phoneNumber: phoneNumber || phoneE164,
    };
  };

  const resetRecaptcha = () => {
    try {
      window.recaptchaVerifier?.clear?.();
    } catch {}
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
      }
    );
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const formatted = toE164(countryCode, phone);
    if (!formatted) {
      notify("Enter a valid phone number (with correct country).");
      return;
    }

    setIsSending(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formatted, appVerifier);
      setConfirmationResult(result);
      setStep("enterOtp");
      setResendCooldown(30);
      notify("OTP sent to your phone.", "success");
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/invalid-phone-number") {
        notify("Invalid phone number. Please check and try again.");
      } else if (code === "auth/too-many-requests") {
        notify("Too many attempts. Please wait a bit and try again.");
      } else if (code === "auth/quota-exceeded") {
        notify("SMS quota exceeded. Please try again later.");
      } else {
        notify(err?.message || "Failed to send OTP. Please try again.");
      }
      resetRecaptcha();
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      notify("Please enter the 6-digit OTP sent to your phone.");
      return;
    }
    if (!confirmationResult) {
      notify("Please request a new OTP.");
      return;
    }

    setIsVerifying(true);
    try {
      const credential = await confirmationResult.confirm(otp);
      const user = credential.user;
      const phoneE164 = user.phoneNumber;

      const { role, phoneNumber } = await ensureUserDocument(
        user.uid,
        phoneE164
      );
      persistSession(role, phoneNumber);

      notify("Login successful!", "success");
      navigate("/");
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/invalid-verification-code") {
        notify("Invalid OTP. Please check and try again.");
      } else if (code === "auth/code-expired") {
        notify("OTP expired. Please resend and try again.");
      } else {
        notify(err?.message || "Verification failed. Please try again.");
      }
      resetRecaptcha();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const fakeEvent = { preventDefault: () => {} };
    await handleSendOtp(fakeEvent);
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Required container for Firebase reCAPTCHA (invisible) */}
      <div id="recaptcha-container" />

      {/* Two-column layout: image left, form right */}
      <div className="h-full w-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Hero Image */}
        <div className="relative hidden lg:block">
          <img
            src="src/assets/images/bus-login.jpeg"
            alt="Modern coach bus parked at terminal"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Caption / overlay content (no bg color; just text with shadow for contrast) */}
        </div>

        {/* Right: Auth Card */}
        <div className="flex items-center justify-center px-4 h-full">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-2 flex items-center gap-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/10">
                <HiOutlineLockClosed className="text-xl text-slate-800" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Sign in to Leoforeio
                </h1>
                <p className="text-xs text-slate-600">
                  Use your verified mobile number to continue
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white shadow-xl transition-all">
              {/* Step: Enter Phone */}
              {step === "enterPhone" && (
                <form onSubmit={handleSendOtp} className="p-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-800">
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <div
                        className="relative"
                        style={{ position: "relative" }}
                      >
                        <FiSmartphone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                        <select
                          className="w-36 appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          style={{
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          {COUNTRIES.map((country) => (
                            <option key={country.code} value={country.dial}>
                              {country.code} {country.dial}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                        placeholder="7xxxxxxxx (no leading 0)"
                        required
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      We’ll send a 6-digit verification code via SMS.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className={`w-full rounded-lg px-4 py-3 font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isSending
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-blue-900 hover:bg-blue-700 active:scale-[0.99]"
                    }`}
                  >
                    {isSending ? "Sending…" : "Send OTP"}
                  </button>

                  <div className="flex justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => navigate("/help")}
                      className="font-medium text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      Need help?
                    </button>
                  </div>
                </form>
              )}

              {/* Step: Enter OTP */}
              {step === "enterOtp" && (
                <form onSubmit={handleVerifyOtp} className="p-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-800">
                      Enter 6-digit OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-lg tracking-widest text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      placeholder="••••••"
                      required
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStep("enterPhone")}
                        className="text-sm text-slate-600 hover:text-slate-800 hover:underline"
                      >
                        Change phone number
                      </button>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0}
                        className={`inline-flex items-center gap-2 text-sm font-semibold ${
                          resendCooldown > 0
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-blue-700 hover:text-blue-800"
                        }`}
                      >
                        <FiRotateCw className="text-base" />
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : "Resend OTP"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className={`w-full rounded-lg px-4 py-3 font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isVerifying
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
                    }`}
                  >
                    {isVerifying ? "Verifying…" : "Verify & Continue"}
                  </button>
                </form>
              )}
            </div>

            {/* Small print */}
            <p className="mt-4 text-xs text-slate-500">
              By continuing, you agree to our Terms & Privacy Policy.
            </p>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

export default Login;
