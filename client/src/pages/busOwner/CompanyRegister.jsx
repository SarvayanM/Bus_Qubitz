// src/pages/company/BoSignupWithCompany.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import auth, { db } from "../../services/firebaseAuth";
import { createCompany, checkCompanyExists } from "../../api/company";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const EMPTY_FORM = {
  companyName: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  registrationNumber: "",
  contactPerson: "",
  password: "",
  confirmPassword: "",
};

export default function CompanyRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

  const notify = (message, type = "error") =>
    toast[type](message, {
      position: "top-center",
      autoClose: 3500,
      pauseOnHover: true,
      draggable: true,
      theme: "light",
    });

  const onChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // validations
    if (!form.companyName.trim()) return notify("Company name is required.");
    if (!EMAIL_RE.test(form.email)) return notify("Valid email is required.");
    if (!form.phone.trim()) return notify("Phone is required.");
    if (!PASSWORD_RE.test(form.password))
      return notify(
        "Password must include uppercase, lowercase, number & special character (min 8 chars)."
      );
    if (form.password !== form.confirmPassword)
      return notify("Passwords do not match.");

    setIsSubmitting(true);

    try {
      // 1. Check if company exists
      const exists = await checkCompanyExists(form.companyName.trim());
      if (exists) {
        notify("Company name already exists.");
        setIsSubmitting(false);
        return;
      }

      // 2. Create Firebase user
      const { user } = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // 3. Save user in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "busOwner",
        createdAt: new Date().toISOString(),
      });

      // 4. Create company in backend
      await createCompany({
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address?.trim(),
        website: form.website?.trim(),
        registrationNumber: form.registrationNumber?.trim(),
        contactPerson: form.contactPerson?.trim(),
        ownerId: user.uid,
      });

      notify("Company & account registered successfully!", "success");

      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error(err);
      notify(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4 py-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/5 to-[#16A34A]/5"></div>

        <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl z-10 border border-[#2563EB]/10 p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Bus Owner Signup & Company Registration
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Info */}
            <div>
              <label className="block text-sm font-medium">
                Company Name *
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.companyName}
                onChange={onChange("companyName")}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Email *</label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.email}
                  onChange={onChange("email")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Phone *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.phone}
                  onChange={onChange("phone")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Address</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.address}
                onChange={onChange("address")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Website</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.website}
                  onChange={onChange("website")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Registration No.
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.registrationNumber}
                  onChange={onChange("registrationNumber")}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Contact Person
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.contactPerson}
                onChange={onChange("contactPerson")}
              />
            </div>

            {/* Account Info */}
            <div>
              <label className="block text-sm font-medium">Password *</label>
              <input
                type={showPw ? "text" : "password"}
                className="w-full border rounded-lg px-3 py-2"
                value={form.password}
                onChange={onChange("password")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="text-xs text-blue-600 mt-1"
              >
                {showPw ? "Hide" : "Show"} Password
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Confirm Password *
              </label>
              <input
                type={showPw2 ? "text" : "password"}
                className="w-full border rounded-lg px-3 py-2"
                value={form.confirmPassword}
                onChange={onChange("confirmPassword")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw2((s) => !s)}
                className="text-xs text-blue-600 mt-1"
              >
                {showPw2 ? "Hide" : "Show"} Password
              </button>
            </div>

            <div className="pt-3 text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium shadow-md hover:bg-blue-700 disabled:opacity-60"
              >
                {isSubmitting ? "Creating…" : "Register Company & Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
