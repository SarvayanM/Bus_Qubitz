// frontend/src/pages/UpdateProfile.jsx
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast, { Toaster } from "react-hot-toast";
import {
  getPassengerByPhone,
  updatePassengerByPhone,
} from "../../api/passenger";
import { useNavigate } from "react-router-dom";

const pad2 = (n) => String(n).padStart(2, "0");
const fmtNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export default function UpdateProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // phone is our identity key; pulled from cookie "phoneNumber"
  const [phoneKey, setPhoneKey] = useState("");

  const [form, setForm] = useState({
    fname: "",
    lname: "",
    phone: "", // editable; you may choose to lock this if you prefer
    gender: "", // "", "Male", "Female"
    email: "", // optional in model
  });

  const [errors, setErrors] = useState({
    fname: "",
    lname: "",
    phone: "",
    gender: "",
    email: "",
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
    phone: (v) =>
      !v
        ? "Phone is required."
        : /^\+94\d{9}$/.test(v)
        ? ""
        : "Phone must start with +94 and have 9 digits after it.",
    // gender is optional per model, but if provided must be Male/Female/""
    gender: (v) =>
      v === "" || v === "Male" || v === "Female"
        ? ""
        : "Select Male or Female.",
    email: (v) =>
      !v
        ? ""
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? ""
        : "Enter a valid email.",
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
  const requiredMissing = !form.fname || !form.lname || !form.phone; // gender & email optional now
  const canSave = !hasVisibleErrors && !requiredMissing;

  /* ---------------------- load identity from cookie ---------------------- */
  useEffect(() => {
    // cookie name per your note
    const p = Cookies.get("phoneNumber") || "";
    setPhoneKey(p);
  }, []);

  /* ---------------------- fetch profile ---------------------- */
  useEffect(() => {
    if (!phoneKey) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const p = await getPassengerByPhone(phoneKey);
        if (!mounted) return;
        if (p) {
          setForm({
            fname: p.fname || "",
            lname: p.lname || "",
            phone: p.phone || phoneKey,
            gender: p.gender ?? "",
            email: p.email ?? "",
          });
        }
      } catch (e) {
        setErr(
          e?.response?.data?.message || e?.message || "Failed to load profile"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [phoneKey]);

  /* ---------------------- submit ---------------------- */
  const onSubmit = async (e) => {
    e.preventDefault();

    const next = {
      fname: validators.fname(form.fname),
      lname: validators.lname(form.lname),
      phone: validators.phone(form.phone),
      gender: validators.gender(form.gender),
      email: validators.email(form.email),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      const updated = await updatePassengerByPhone(phoneKey, {
        fname: form.fname.trim(),
        lname: form.lname.trim(),
        phone: form.phone, // allow phone change; backend handles uniqueness
        gender: form.gender || "",
        email: form.email || "",
      });
      toast.success("Profile updated successfully.");

      // If phone changed, refresh cookie + key
      if (updated?.phone && updated.phone !== phoneKey) {
        Cookies.set("phoneNumber", updated.phone, { expires: 365 });
        setPhoneKey(updated.phone);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Update failed");
    }
  };

  /* ---------------------- UI ---------------------- */
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Toaster />
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <span className="text-slate-700 font-medium">Loading profile…</span>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Toaster />
        <div className="rounded-2xl border border-rose-200 bg-white px-8 py-5 shadow-md max-w-md text-center">
          <div className="text-rose-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-slate-700">{err}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#2563EB]/10 to-[#16A34A]/10 py-8 mt-12">
      <Toaster />
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen" />
      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            Update{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-emerald-300">
              Profile
            </span>
          </h1>
          <p className="mt-2 text-slate-200/80">Last loaded: {fmtNow()}</p>
          {typeof form.walletBalance === "number" && (
            <p className="mt-1 text-slate-100">
              Wallet balance:{" "}
              <strong>Rs. {form.walletBalance.toFixed(2)}</strong>
            </p>
          )}
        </header>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl p-6 md:p-8"
        >
          {/* Identity (cookie) */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Account Phone (from cookie)
            </label>
            <input
              type="tel"
              value={phoneKey}
              readOnly
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 shadow-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Your account is identified by the <code>phoneNumber</code> cookie.
            </p>
          </div>

          {/* Name grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <Field
              label="First Name"
              value={form.fname}
              onChange={handleChange("fname")}
              onBlur={handleBlur("fname")}
              placeholder="e.g., Nimal"
              error={errors.fname}
            />
            <Field
              label="Last Name"
              value={form.lname}
              onChange={handleChange("lname")}
              onBlur={handleBlur("lname")}
              placeholder="e.g., Perera"
              error={errors.lname}
            />
          </div>

          {/* Phone & Email */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Field
              label="Phone (+94xxxxxxxxx)"
              value={form.phone}
              onChange={handleChange("phone")}
              onBlur={handleBlur("phone")}
              placeholder="+94xxxxxxxxx"
              error={errors.phone}
              type="tel"
            />
            <Field
              label="Email (optional)"
              value={form.email}
              onChange={handleChange("email")}
              onBlur={handleBlur("email")}
              placeholder="you@example.com"
              error={errors.email}
              type="email"
            />
          </div>

          {/* Gender + Buttons */}
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Gender
              </label>
              <select
                value={form.gender ?? ""}
                onChange={handleChange("gender")}
                onBlur={handleBlur("gender")}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Prefer not to say</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              {errors.gender && (
                <p className="text-rose-600 text-xs mt-1">{errors.gender}</p>
              )}
            </div>

            <div className="flex items-end gap-3 justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow transition bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate("/bookingHistory")}
              >
                Booking History
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow transition ${
                  canSave
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-400 cursor-not-allowed"
                }`}
                title="Save changes"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>

      <style>{`@media print { .print\\:hidden { display:none } }`}</style>
    </div>
  );
}

/* ------------------------------ UI atom ------------------------------ */
function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  type = "text",
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-4 py-3 text-slate-900 shadow-sm outline-none ${
          error
            ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        }`}
      />
      {error && <p className="text-rose-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
