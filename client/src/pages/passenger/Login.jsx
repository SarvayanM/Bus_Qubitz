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
import Cookies from "js-cookie";
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

// ✅ Import the image instead of using "src/..."
import busLoginImage from "../../assets/images/bus-login.jpeg";

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
      position: "top-right",
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
      if (user) navigate("/");
    });
    return () => unsub();
  }, [navigate]);

  const persistSession = (role, phoneE164) => {
    localStorage.setItem("role", role);
    localStorage.setItem("userPhone", phoneE164);

    try {
      Cookies.set("phone", phoneE164, { expires: 7, sameSite: "Strict" });
      Cookies.set("phoneNumber", phoneE164, { expires: 7, sameSite: "Strict" });
      Cookies.set("phone_verified", "true", { expires: 7, sameSite: "Strict" });
    } catch (e) {
      document.cookie = `phone=${encodeURIComponent(
        phoneE164
      )}; path=/; max-age=${7 * 24 * 60 * 60}; Secure; SameSite=Strict`;
      document.cookie = `phoneNumber=${encodeURIComponent(
        phoneE164
      )}; path=/; max-age=${7 * 24 * 60 * 60}; Secure; SameSite=Strict`;
      document.cookie = `phone_verified=true; path=/; max-age=${
        7 * 24 * 60 * 60
      }; Secure; SameSite=Strict`;
    }

    setUserRole(role);
  };

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
      setTimeout(() => navigate("/"), 900);
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
            src={busLoginImage} // ✅ use imported image
            alt="Modern coach bus parked at terminal"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Right: Auth Card */}
        <div className="flex items-center justify-center px-4 h-full">
          <div className="w-full max-w-md">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Hop on the Leoforeio Ride
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Just select your seats and complete passenger details to proceed
                with your booking
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white shadow-xl transition-all">
              {/* Step: Enter Phone */}
              {step === "enterPhone" && (
                <form onSubmit={handleSendOtp} className="p-5 space-y-4">
                  {/* ... unchanged form content ... */}
                </form>
              )}

              {/* Step: Enter OTP */}
              {step === "enterOtp" && (
                <form onSubmit={handleVerifyOtp} className="p-5 space-y-4">
                  {/* ... unchanged form content ... */}
                </form>
              )}
            </div>

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
