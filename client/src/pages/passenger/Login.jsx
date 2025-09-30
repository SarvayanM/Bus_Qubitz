import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import auth, { db } from "../../services/firebaseAuth";
import { getDoc, doc } from "firebase/firestore";
import RoleContext from "../../components/common/RoleContext";

function Login() {
  const navigate = useNavigate();
  const { setUserRole } = useContext(RoleContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignupOptions, setShowSignupOptions] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

  const notify = (message, type = "error") =>
    toast[type](message, {
      position: "top-center",
      autoClose: 3000,
      pauseOnHover: true,
      draggable: true,
      theme: "colored",
    });

  const persistSession = (role, emailToStore) => {
    localStorage.setItem("role", role);
    localStorage.setItem("userEmail", emailToStore);
    document.cookie = `email=${emailToStore}; path=/; max-age=86400`;
    setUserRole(role);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!EMAIL_RE.test(email)) {
      notify("Please enter a valid email address.");
      return;
    }
    if (password === "") {
      notify("Password cannot be empty.");
      return;
    }
    if (!PASSWORD_RE.test(password)) {
      notify(
        "Password must include uppercase, lowercase, number & special character (min 8 characters)."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (email === "admin@gmail.com" && password === "Admin@123") {
        persistSession("admin", email);
        notify("Login successful!", "success");
        navigate("/home");
        return;
      }

      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role = userDoc.data()?.role || "passenger";

      persistSession(role, email);
      document.cookie = `email=${encodeURIComponent(email)}; path=/; max-age=${
        7 * 24 * 60 * 60
      }; Secure; SameSite=Strict`;

      notify("Login successful!", "success");
      navigate("/");
    } catch (error) {
      const errorMessages = {
        "auth/user-not-found": "No user found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Invalid email/password combination.",
      };
      notify(errorMessages[error.code] || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4 py-8">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/5 to-[#16A34A]/5"></div>

        {/* Login Card */}
        <div className="relative w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden z-10 border border-[#2563EB]/10">
          {/* Header */}
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
            <p className="text-white/90 text-lg">
              Please login to continue your journey
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#F9FAFB] border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition duration-200"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-[#2563EB]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#F9FAFB] border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition duration-200"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-[#2563EB]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 bg-[#F9FAFB] p-2 rounded border border-gray-200">
                Must include: uppercase, lowercase, number, special character
                (min 8 chars)
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] cursor-pointer ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#2563EB] to-[#16A34A] hover:from-[#1d4ed8] hover:to-[#15803d] hover:shadow-xl transform hover:scale-[1.02]"
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">
                  Don't have an account?
                </span>
              </div>
            </div>

            {/* Action Links */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 text-center">
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="text-[#2563EB] font-semibold hover:text-[#16A34A] text-sm hover:underline transition duration-200 px-2 py-1 rounded cursor-pointer"
              >
                Create an account
              </button>
              <button
                type="button"
                onClick={() => navigate("/forgotPassword")}
                className="text-[#2563EB] font-semibold hover:text-[#16A34A] text-sm hover:underline transition duration-200 px-2 py-1 rounded cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default Login;
