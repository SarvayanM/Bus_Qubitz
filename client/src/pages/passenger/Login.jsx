import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
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

  // Initialize invisible reCAPTCHA exactly once, and watch auth state
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
      // If already signed in (e.g., page reload after successful login), go home
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

    // If exists, read role & phoneNumber; backfill any missing values.
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
      // Common Firebase Auth phone errors handled with nicer messages
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
      const phoneE164 = user.phoneNumber; // Verified E.164 from Firebase

      // Create or read Firestore user doc, ensuring both phoneNumber & role are set.
      const { role, phoneNumber } = await ensureUserDocument(
        user.uid,
        phoneE164
      );

      // Persist session (cookies + localStorage + RoleContext)
      persistSession(role, phoneNumber);

      notify("Login successful!", "success");
      navigate("/home");
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/invalid-verification-code") {
        notify("Invalid OTP. Please check and try again.");
      } else if (code === "auth/code-expired") {
        notify("OTP expired. Please resend and try again.");
      } else {
        notify(err?.message || "Verification failed. Please try again.");
      }
      // after a failed confirmation, rebuild recaptcha to be safe
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
    <>
      {/* Required container for Firebase reCAPTCHA (invisible) */}
      <div id="recaptcha-container" />

      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4 py-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/5 to-[#16A34A]/5" />

        <div className="relative w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden z-10 border border-[#2563EB]/10">
          <div className="bg-gradient-to-r from-[#2563EB]/90 to-[#16A34A]/90 p-8 text-center text-white backdrop-blur-sm">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-white/90 text-lg">Sign in with your phone</p>
          </div>

          {/* Step: Enter Phone */}
          {step === "enterPhone" && (
            <form onSubmit={handleSendOtp} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    className="w-28 px-3 py-3 rounded-lg bg-[#F9FAFB] border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition duration-200"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+94">LK +94</option>
                    <option value="+91">IN +91</option>
                    <option value="+971">AE +971</option>
                    <option value="+1">US +1</option>
                    <option value="+44">UK +44</option>
                  </select>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg bg-[#F9FAFB] border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition duration-200"
                    placeholder="7xxxxxxxx (no leading 0)"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 bg-[#F9FAFB] p-2 rounded border border-gray-200">
                  You’ll receive a 6-digit code via SMS.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className={`w-full py-4 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] cursor-pointer ${
                    isSending
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#2563EB] to-[#16A34A] hover:from-[#1d4ed8] hover:to-[#15803d] hover:shadow-xl transform hover:scale-[1.02]"
                  }`}
                >
                  {isSending ? "Sending..." : "Send OTP"}
                </button>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">
                    Need to create an account?
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="text-[#2563EB] font-semibold hover:text-[#16A34A] text-sm hover:underline transition duration-200 px-2 py-1 rounded cursor-pointer"
                >
                  Continue to Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/help")}
                  className="text-[#2563EB] font-semibold hover:text-[#16A34A] text-sm hover:underline transition duration-200 px-2 py-1 rounded cursor-pointer"
                >
                  Need help?
                </button>
              </div>
            </form>
          )}

          {/* Step: Enter OTP */}
          {step === "enterOtp" && (
            <form onSubmit={handleVerifyOtp} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 rounded-lg bg-[#F9FAFB] border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition duration-200 tracking-widest text-center text-lg"
                  placeholder="••••••"
                  required
                />
                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={() => setStep("enterPhone")}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Change phone number
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className={`text-sm font-semibold ${
                      resendCooldown > 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-[#2563EB] hover:text-[#16A34A]"
                    }`}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend OTP"}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className={`w-full py-4 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] cursor-pointer ${
                    isVerifying
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#2563EB] to-[#16A34A] hover:from-[#1d4ed8] hover:to-[#15803d] hover:shadow-xl transform hover:scale-[1.02]"
                  }`}
                >
                  {isVerifying ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default Login;
