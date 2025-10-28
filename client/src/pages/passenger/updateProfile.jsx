// frontend/src/pages/UpdateProfile.jsx
import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
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
  ArrowLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const emptyPassenger = (phone = "") => ({
  phone: phone || "",
  fname: "",
  lname: "",
  nic: "",
  email: "",
  walletBalance: 0,
});

export default function UpdateProfile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyPassenger());
  const [original, setOriginal] = useState(emptyPassenger());

  // Read the phone (login cookie) and fetch the passenger
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const phone = Cookies.get("phone") || "";
        if (!phone) {
          toast.error("You're not logged in.");
          setForm(emptyPassenger(""));
          setOriginal(emptyPassenger(""));
          setExists(false);
          return;
        }

        // Always keep phone read-only in state
        let p = null;
        try {
          p = await getPassengerByPhone(phone);
        } catch {
          // non-fatal; treat as not found
        }

        if (p && p.phone) {
          const normalized = {
            phone: String(p.phone || phone),
            fname: String(p.fname || ""),
            lname: String(p.lname || ""),
            nic: String(p.nic || ""),
            email: String(p.email || ""),
            walletBalance:
              typeof p.walletBalance === "number"
                ? p.walletBalance
                : Number(p.walletBalance || 0),
          };
          setForm(normalized);
          setOriginal(normalized);
          setExists(true);
        } else {
          const base = emptyPassenger(phone);
          setForm(base);
          setOriginal(base);
          setExists(false);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derived "dirty" check
  const isDirty = useMemo(() => {
    const sanitize = (v) =>
      typeof v === "string" ? v.trim() : typeof v === "number" ? v : v ?? "";
    return (
      sanitize(form.fname) !== sanitize(original.fname) ||
      sanitize(form.lname) !== sanitize(original.lname) ||
      sanitize(form.nic) !== sanitize(original.nic) ||
      sanitize(form.email) !== sanitize(original.email) ||
      Number(form.walletBalance) !== Number(original.walletBalance)
    );
  }, [form, original]);

  const onChange = (key, val) => {
    setForm((f) => ({
      ...f,
      [key]: key === "walletBalance" ? (val === "" ? "" : Number(val)) : val,
    }));
  };

  // -------- Strict validations (without changing submit logic) --------
  // Rules:
  // - phone: required (read-only)
  // - fname, lname: required, letters/spaces/hyphens only, 2–40 chars
  // - nic: required if provided? (keep optional but strict when present);
  //        validate Sri Lanka formats: 9 digits + V/X (case-insensitive) OR 12 digits
  // - email: optional, but if present must be valid
  // - walletBalance: non-negative number (read-only UI)
  const validate = () => {
    const e = {};
    const nameRe = /^[A-Za-z][A-Za-z\s\-]{1,39}$/; // 2–40 chars, letters/spaces/hyphens

    // phone is read-only; assume valid if present
    if (!form.phone) e.phone = "Phone is required.";

    const fname = (form.fname || "").trim();
    if (!fname) {
      e.fname = "First name is required.";
    } else if (!nameRe.test(fname)) {
      e.fname =
        "First name must be 2–40 letters and may include spaces or hyphens.";
    }

    const lname = (form.lname || "").trim();
    if (!lname) {
      e.lname = "Last name is required.";
    } else if (!nameRe.test(lname)) {
      e.lname =
        "Last name must be 2–40 letters and may include spaces or hyphens.";
    }

    const nic = (form.nic || "").trim();
    if (nic) {
      const nicReOld = /^\d{9}[VvXx]$/; // e.g., 123456789V
      const nicReNew = /^\d{12}$/; // 12 digits
      if (!nicReOld.test(nic) && !nicReNew.test(nic)) {
        e.nic = "NIC must be 9 digits followed by V/X or 12 digits.";
      }
    }

    const email = (form.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Please enter a valid email address.";
    }

    if (
      form.walletBalance === "" ||
      isNaN(Number(form.walletBalance)) ||
      Number(form.walletBalance) < 0
    ) {
      e.walletBalance = "Wallet balance must be a non-negative number.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fix the errors.");
      return;
    }
    if (exists && !isDirty) {
      toast("You didn't change anything.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fname: form.fname.trim(),
        lname: form.lname.trim(),
        nic: form.nic.trim(),
        email: form.email.trim(),
        walletBalance: Number(form.walletBalance),
      };

      if (exists) {
        await updatePassengerByPhone(form.phone, payload);
        toast.success("Profile updated successfully!");
        setOriginal({ ...form, ...payload });
      } else {
        // Create expects phone plus other fields
        await createPassenger({ phone: form.phone, ...payload });
        toast.success("Profile created successfully!");
        setExists(true);
        setOriginal({ phone: form.phone, ...payload });
      }
    } catch (err) {
      console.error(err);
      toast.error(
        exists ? "Failed to update profile." : "Failed to create profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-1/3 mb-6"></div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-12 bg-slate-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        {/* Top Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-xs text-gray-500" aria-live="polite">
            {exists ? "Existing profile" : "New profile"}
          </div>
        </div>

        {/* Header Section */}
        <div className="text-center mb-8 animate-slide-down">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            {exists
              ? "View / Update Your Profile Passport"
              : "Complete Your Profile Passport"}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            {exists
              ? "Manage your personal information and preferences."
              : "Let's get you set up with your passenger profile."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Phone (read-only) */}
            <Field
              label="Phone Number"
              icon={<PhoneIcon className="w-5 h-5" />}
              error={errors.phone}
            >
              <div className="relative group">
                <input
                  type="text"
                  value={form.phone}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-100 px-4 py-3 text-gray-700 font-medium outline-none transition-all duration-200 focus:border-blue-900 cursor-not-allowed"
                  title="This field is read-only"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded-full font-medium">
                    Verified
                  </span>
                </div>
              </div>
            </Field>

            {/* Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <Field
                label="First Name"
                icon={<UserIcon className="w-5 h-5" />}
                error={errors.fname}
                helper="2–40 letters; spaces and hyphens allowed"
              >
                <input
                  type="text"
                  value={form.fname}
                  onChange={(e) => onChange("fname", e.target.value)}
                  placeholder="John"
                  className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-900 ${
                    errors.fname
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-200"
                  }`}
                />
              </Field>

              {/* Last Name */}
              <Field
                label="Last Name"
                icon={<UserIcon className="w-5 h-5" />}
                error={errors.lname}
                helper="2–40 letters; spaces and hyphens allowed"
              >
                <input
                  type="text"
                  value={form.lname}
                  onChange={(e) => onChange("lname", e.target.value)}
                  placeholder="Doe"
                  className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-900 ${
                    errors.lname
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-200"
                  }`}
                />
              </Field>
            </div>

            {/* NIC */}
            <Field
              label="National ID (NIC)"
              icon={<IdentificationIcon className="w-5 h-5" />}
              error={errors.nic}
              helper="Format: 123456789V / 123456789X or 12 digits"
            >
              <input
                type="text"
                value={form.nic}
                onChange={(e) => onChange("nic", e.target.value)}
                placeholder="123456789V"
                className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-900 ${
                  errors.nic
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-200"
                }`}
              />
            </Field>

            {/* Email */}
            <Field
              label="Email Address"
              icon={<EnvelopeIcon className="w-5 h-5" />}
              error={errors.email}
              helper="We'll never share your email"
            >
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="john.doe@example.com"
                className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-900 ${
                  errors.email
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-200"
                }`}
              />
            </Field>

            {/* Wallet Balance (read-only) */}
            <Field
              label="Wallet Balance"
              icon={<WalletIcon className="w-5 h-5" />}
              error={errors.walletBalance}
              helper="Managed by the system"
            >
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium">
                  LKR
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.walletBalance}
                  readOnly
                  aria-readonly="true"
                  title="This field is read-only"
                  className="w-full rounded-xl border-2 pl-16 pr-4 py-3 outline-none transition-all duration-200 border-gray-200 bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              </div>
            </Field>

            {/* Status & Actions */}
            <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isDirty ? "bg-yellow-400 animate-pulse" : "bg-green-500"
                  }`}
                />
                <span className="text-gray-700 font-medium">
                  {exists ? (
                    isDirty ? (
                      <span className="text-yellow-700">Unsaved changes</span>
                    ) : (
                      <span className="text-green-700">All changes saved</span>
                    )
                  ) : (
                    <span className="text-blue-900">New passenger profile</span>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || (exists && !isDirty)}
                className={`group relative inline-flex items-center gap-3 rounded-xl px-8 py-3 font-semibold text-white transition-all duration-300 overflow-hidden ${
                  exists && !isDirty
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-900 hover:bg-blue-800 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                } ${saving ? "opacity-80" : ""}`}
                aria-busy={saving ? "true" : "false"}
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                <CheckCircleIcon
                  className={`w-5 h-5 transition-transform duration-300 ${
                    saving ? "animate-spin" : "group-hover:scale-110"
                  }`}
                />
                <span className="font-semibold tracking-wide">
                  {saving
                    ? "Processing..."
                    : exists
                    ? "Update Profile"
                    : "Create Profile"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help? Contact our support team at{" "}
            <a
              href="mailto:support@busbookingsystem.com"
              className="text-blue-900 hover:text-blue-800 font-semibold underline transition-colors duration-200 cursor-pointer"
            >
              support@busbookingsystem.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ UI helpers ------------------------------ */
function Field({ label, icon, children, error, helper }) {
  return (
    <div className="space-y-2 animate-rise">
      <label className="block text-sm font-semibold text-gray-900 tracking-wide">
        <span className="inline-flex items-center gap-2">
          <span className="text-blue-900">{icon}</span>
          {label}
        </span>
      </label>
      {children}
      <div className="min-h-[20px]">
        {helper && !error ? (
          <p className="text-xs text-gray-500 font-medium">{helper}</p>
        ) : null}
        {error ? (
          <p
            className="text-xs text-red-600 font-medium flex items-center gap-1 animate-shake"
            role="alert"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
