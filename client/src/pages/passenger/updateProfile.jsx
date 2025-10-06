import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast, { Toaster } from "react-hot-toast";
import {
  getPassengerByEmail,
  updatePassengerByEmail,
} from "../../api/passenger";

const pad2 = (n) => String(n).padStart(2, "0");
const fmtNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export default function UpdateProfile() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // email is our identity key; pulled from cookie
  const [email, setEmail] = useState("");

  const [form, setForm] = useState({
    fname: "",
    lname: "",
    phone: "",
    gender: "",
  });

  const [errors, setErrors] = useState({
    fname: "",
    lname: "",
    phone: "",
    gender: "",
  });

  useEffect(() => {
    const e = Cookies.get("email") || ""; // <- you already set this elsewhere
    setEmail(e);
  }, []);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const p = await getPassengerByEmail(email);
        if (!mounted) return;
        if (p) {
          setForm({
            fname: p.fname || "",
            lname: p.lname || "",
            phone: p.phone || "",
            gender: p.gender || "",
          });
        }
      } catch (e) {
        setErr(e?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [email]);

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
    gender: (v) =>
      v === "Male" || v === "Female" ? "" : "Select Male or Female.",
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

  const hasVisibleErrors =
    !!errors.fname || !!errors.lname || !!errors.phone || !!errors.gender;

  const requiredMissing =
    !email || !form.fname || !form.lname || !form.phone || !form.gender;

  const canSave = !hasVisibleErrors && !requiredMissing;

  const onSubmit = async (e) => {
    e.preventDefault();
    // validate once more
    const next = {
      fname: validators.fname(form.fname),
      lname: validators.lname(form.lname),
      phone: validators.phone(form.phone),
      gender: validators.gender(form.gender),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      await updatePassengerByEmail({
        email,
        fname: form.fname.trim(),
        lname: form.lname.trim(),
        phone: form.phone,
        gender: form.gender,
      });
      toast.success("Profile updated successfully.");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Update failed");
    }
  };

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
      {/* scenic photo layer like your Add Bus screen */}
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen" />
      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            Update{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-emerald-300">
              Profile
            </span>
          </h1>
          <p className="mt-2 text-slate-200/80">
            Keep your contact details up to date. Last loaded: {fmtNow()}
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl p-6 md:p-8"
        >
          {/* Email (read-only identity) */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Email (account)
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 shadow-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Email identifies your account. (If you need to change it, add a
              separate
              <em> Change Email </em> flow.)
            </p>
          </div>

          {/* Name grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <Field
              label="First Name"
              value={form.fname}
              onChange={handleChange("fname")}
              onBlur={handleBlur("fname")}
              placeholder="e.g., Sarvayan"
              error={errors.fname}
            />
            <Field
              label="Last Name"
              value={form.lname}
              onChange={handleChange("lname")}
              onBlur={handleBlur("lname")}
              placeholder="e.g., Meenadchisundaram"
              error={errors.lname}
            />
          </div>

          {/* Phone */}
          <div className="mt-4">
            <Field
              label="Phone (+94xxxxxxxxx)"
              value={form.phone}
              onChange={handleChange("phone")}
              onBlur={handleBlur("phone")}
              placeholder="+94xxxxxxxxx"
              error={errors.phone}
              type="tel"
            />
          </div>

          {/* Gender + Save */}
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={handleChange("gender")}
                onBlur={handleBlur("gender")}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              {errors.gender && (
                <p className="text-rose-600 text-xs mt-1">{errors.gender}</p>
              )}
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={!canSave}
                className={`ml-auto inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow transition
                ${
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

      {/* print rules are not needed here but kept as example */}
      <style>{`
        @media print { .print\\:hidden { display:none } }
      `}</style>
    </div>
  );
}

/* ------------------------------- UI atoms --------------------------------- */
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
        className={`w-full rounded-xl border px-4 py-3 text-slate-900 shadow-sm outline-none
        ${
          error
            ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        }`}
      />
      {error && <p className="text-rose-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
