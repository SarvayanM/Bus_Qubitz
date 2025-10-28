// frontend/src/pages/UpdateProfile.jsx
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import BusLoader from "../../components/bus/BusLoader";
import {
  getPassengerByPhone,
  updatePassengerByPhone,
  createPassenger,
} from "../../api/passenger";
import { useNavigate } from "react-router-dom";
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  WalletIcon,
  ClockIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

/* ---------------------- utils ---------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const fmtNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// Single place to switch routes if your app uses kebab-case vs camelCase
const BOOKING_HISTORY_PATH = "/bookingHistory"; // change here if needed (e.g., "/booking-history")

export default function UpdateProfile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isExisting, setIsExisting] = useState(false);
  const [original, setOriginal] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");

  // Phone as stored & displayed (must be E.164, e.g. +94123456789)
  const [displayPhone, setDisplayPhone] = useState("");

  const [form, setForm] = useState({
    fname: "",
    lname: "",
    phone: "", // server-returned (not editable)
    nic: "",
    email: "",
    walletBalance: 0,
  });

  const [errors, setErrors] = useState({
    fname: "",
    lname: "",
    phone: "",
    nic: "",
    email: "",
    walletBalance: "",
  });

  /* ---------------------- validators ---------------------- */
  const validators = {
    fname: (v) =>
      !v
        ? "First name is required."
        : /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(v.trim())
        ? ""
        : "Enter a valid first name.",
    lname: (v) =>
      !v
        ? "Last name is required."
        : /^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(v.trim())
        ? ""
        : "Enter a valid last name.",
    // Validate E.164 Sri Lanka (+94 + 9 digits)
    phone: (v) =>
      !v
        ? "Phone is required."
        : /^\+94\d{9}$/.test(v)
        ? ""
        : "Phone must start with +94 and have 9 digits after it.",
    nic: (v) => {
      if (!v) return "";
      const s = String(v).trim();
      const oldNic = /^\d{9}[VXvx]$/;
      const newNic = /^\d{12}$/;
      const passport = /^[A-Za-z0-9\-\s]{5,20}$/;
      return oldNic.test(s) || newNic.test(s) || passport.test(s)
        ? ""
        : "Enter a valid NIC or passport number.";
    },
    email: (v) =>
      !v
        ? ""
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? ""
        : "Enter a valid email.",
    walletBalance: (v) => {
      if (v === undefined || v === null || v === "") return "";
      const n = Number(v);
      return Number.isFinite(n) && n >= 0
        ? ""
        : "Enter a valid non-negative amount.";
    },
  };

  const handleBlur = (field) => (e) => {
    const value = e.target.value;
    const msg = validators[field]?.(value) || "";
    setErrors((er) => ({ ...er, [field]: msg }));
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: "" }));
  };

  const hasVisibleErrors = Object.values(errors).some(Boolean);
  const requiredMissing = !form.fname || !form.lname || !displayPhone;
  const canSave = !hasVisibleErrors && !requiredMissing;

  /* ---------------------- load identity from cookie ---------------------- */
  useEffect(() => {
    // Canonical cookie is `phone` in E.164; keep a fallback to legacy `phoneNumber`
    const p = Cookies.get("phone") || Cookies.get("phoneNumber") || "";
    setDisplayPhone(p);
    setLastUpdated(fmtNow());
  }, []);

  /* ---------------------- fetch profile (send +94… to API) ---------------------- */
  useEffect(() => {
    if (!displayPhone) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        // IMPORTANT: send E.164 (+94...) exactly as stored in the cookie
        const p = await getPassengerByPhone(displayPhone);
        if (!mounted) return;
        if (p) {
          setIsExisting(true);
          setOriginal(p);
          setForm({
            fname: p.fname || "",
            lname: p.lname || "",
            phone: p.phone || displayPhone,
            nic: p.nic || "",
            email: p.email || "",
            walletBalance:
              typeof p.walletBalance === "number" ? p.walletBalance : 0,
          });
        } else {
          setIsExisting(false);
        }
      } catch (e) {
        // If your API returns 404 when not found, you can optionally treat it as "new user" here.
        // For now we surface the message.
        setErr(
          e?.response?.data?.message || e?.message || "Failed to load profile"
        );
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [displayPhone]);

  /* ---------------------- submit (send +94… to API) ---------------------- */
  const onSubmit = async (e) => {
    e.preventDefault();

    // Validate against the E.164 cookie identity (+94…)
    const next = {
      fname: validators.fname(form.fname),
      lname: validators.lname(form.lname),
      phone: validators.phone(displayPhone),
      nic: validators.nic(form.nic),
      email: validators.email(form.email),
      walletBalance: validators.walletBalance(form.walletBalance),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      if (isExisting) {
        const changed = {};
        if ((original.fname || "") !== (form.fname || ""))
          changed.fname = form.fname.trim();
        if ((original.lname || "") !== (form.lname || ""))
          changed.lname = form.lname.trim();
        if ((original.nic || "") !== (form.nic || ""))
          changed.nic = form.nic || "";
        if ((original.email || "") !== (form.email || ""))
          changed.email = form.email || "";
        const origBal = Number(original.walletBalance || 0);
        const curBal = Number(form.walletBalance || 0);
        if (origBal !== curBal) changed.walletBalance = curBal;

        if (Object.keys(changed).length === 0) {
          toast("You didn't change anything.");
          return;
        }

        // IMPORTANT: send E.164 with plus
        const updated = await updatePassengerByPhone(displayPhone, changed);
        toast.success("Profile updated successfully!");
        setOriginal(updated);
        setForm((f) => ({ ...f, ...changed }));
        setLastUpdated(fmtNow());
        setTimeout(() => navigate(BOOKING_HISTORY_PATH), 900);
      } else {
        if (!displayPhone) {
          toast.error("Missing account phone. Cannot create profile.");
          return;
        }
        // IMPORTANT: send E.164 with plus
        const created = await createPassenger({
          phone: displayPhone,
          fname: form.fname.trim(),
          lname: form.lname.trim(),
          nic: form.nic || "",
          email: form.email || "",
          walletBalance: Number(form.walletBalance || 0),
        });
        toast.success("Profile created successfully!");
        setIsExisting(true);
        setOriginal(created);
        setForm((f) => ({ ...f, phone: created.phone || displayPhone }));
        setLastUpdated(fmtNow());
        setTimeout(() => navigate("/"), 900);
      }
    } catch (e) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          (isExisting ? "Update failed" : "Create failed")
      );
    }
  };

  /* ---------------------- UI ---------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <BusLoader
          message="Loading profile..."
          subtext="Fetching your saved information"
          height="h-56"
          className="max-w-md"
        />
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-white px-8 py-6 shadow-lg max-w-md text-center transition-all duration-300 hover:shadow-xl">
          <div className="text-red-700 text-lg font-semibold mb-2 flex items-center justify-center gap-2">
            <div className="h-5 w-5 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            Error Loading Profile
          </div>
          <p className="text-gray-700">{err}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 active:bg-blue-950 transition-colors duration-200 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            Travel Passport
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Manage your personal information and travel preferences
          </p>

          {/* Status Bar */}
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-200 max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <ClockIcon className="h-4 w-4 text-blue-900" />
                <span>Last loaded: {lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <div className="p-6 sm:p-8">
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Identity Section */}
              <section
                aria-labelledby="identity"
                className="rounded-2xl p-5 sm:p-6 border border-blue-100 bg-blue-50/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <PhoneIcon className="h-6 w-6 text-blue-900" />
                  <h2
                    id="identity"
                    className="text-xl font-semibold text-gray-900"
                  >
                    Account Identity
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      Primary Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={displayPhone}
                        readOnly
                        className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 pl-12 text-gray-700 font-medium transition-all duration-200 cursor-not-allowed"
                      />
                      <PhoneIcon className="h-5 w-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Your account is securely linked to this phone number.
                    </p>
                  </div>
                </div>
              </section>

              {/* Personal Information */}
              <section
                aria-labelledby="personal-info"
                className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-6">
                  <UserIcon className="h-6 w-6 text-blue-900" />
                  <h2
                    id="personal-info"
                    className="text-xl font-semibold text-gray-900"
                  >
                    Personal Information
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Field
                    label="First Name"
                    value={form.fname}
                    onChange={handleChange("fname")}
                    onBlur={handleBlur("fname")}
                    placeholder="e.g., Nimal"
                    error={errors.fname}
                    icon={UserIcon}
                    required
                  />
                  <Field
                    label="Last Name"
                    value={form.lname}
                    onChange={handleChange("lname")}
                    onBlur={handleBlur("lname")}
                    placeholder="e.g., Perera"
                    error={errors.lname}
                    icon={UserIcon}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <Field
                    label="Email Address"
                    value={form.email}
                    onChange={handleChange("email")}
                    onBlur={handleBlur("email")}
                    placeholder="you@example.com"
                    error={errors.email}
                    type="email"
                    icon={EnvelopeIcon}
                  />
                  <Field
                    label="NIC / Passport"
                    value={form.nic}
                    onChange={handleChange("nic")}
                    onBlur={handleBlur("nic")}
                    placeholder="Enter NIC or passport"
                    error={errors.nic}
                    icon={IdentificationIcon}
                  />
                </div>
              </section>

              {/* Wallet Information */}
              <section
                aria-labelledby="wallet"
                className="rounded-2xl p-5 sm:p-6 border border-blue-100 bg-blue-50/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <WalletIcon className="h-6 w-6 text-blue-900" />
                  <h2
                    id="wallet"
                    className="text-xl font-semibold text-gray-900"
                  >
                    Wallet Balance
                  </h2>
                </div>
                <Field
                  label="Current Balance"
                  value={form.walletBalance}
                  onChange={handleChange("walletBalance")}
                  onBlur={handleBlur("walletBalance")}
                  placeholder="0"
                  error={errors.walletBalance}
                  type="number"
                  icon={WalletIcon}
                  readOnly
                />
              </section>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 px-6 py-3 text-gray-800 bg-white border border-gray-300 rounded-xl font-semibold transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Back to Dashboard
                </button>

                <div className="flex gap-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-6 py-3 text-blue-900 bg-white border border-blue-900 rounded-xl font-semibold transition-all duration-200 cursor-pointer hover:bg-blue-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                    onClick={() => navigate(BOOKING_HISTORY_PATH)}
                  >
                    <ClockIcon className="h-5 w-5" />
                    Booking History
                  </button>

                  <button
                    type="submit"
                    disabled={!canSave}
                    className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                      canSave
                        ? "bg-blue-900 hover:bg-blue-800 active:bg-blue-950 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    {isExisting ? "Update Profile" : "Create Profile"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* NOTE: plain <style> tag (no jsx attribute) to avoid the non-boolean 'jsx' warning */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
      `}</style>
    </div>
  );
}

/* ------------------------------ Field Component ------------------------------ */
function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  type = "text",
  readOnly = false,
  icon: Icon,
  required = false,
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-800">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className={`h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
              error ? "text-red-600" : "text-gray-400"
            } ${readOnly ? "text-gray-400" : ""}`}
          />
        )}
        <input
          type={type}
          value={value ?? ""} // guard undefined/null
          onChange={onChange}
          onBlur={onBlur}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-4 py-3 font-medium transition-all duration-200 outline-none ${
            Icon ? "pl-12" : "pl-4"
          } ${
            error
              ? "border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200 bg-red-50"
              : readOnly
              ? "border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed"
              : "border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-200 bg-white hover:border-gray-400"
          }`}
        />
      </div>
      {error && (
        <p className="text-red-700 text-sm flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-red-700 rounded-full"></span>
          {error}
        </p>
      )}
    </div>
  );
}
