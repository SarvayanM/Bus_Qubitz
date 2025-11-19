import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import auth, { db } from "../../services/firebaseAuth";
import { getDoc, doc } from "firebase/firestore";
import RoleContext from "../../components/common/RoleContext";
import { getCompanyIdByEmail } from "../../api/company";

/** Optional: point this to your hero image asset (the bus photo). */
const HERO_IMG = "src/assets/images/bus-login.jpeg"; // e.g., /public/assets/hero-bus.jpg — replace with your path

function CompanyLogin() {
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
        navigate("/");
        return;
      }

      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role = userDoc.data()?.role || "busOwner";
      console.log(role);

      if (role === "busOwner") {
        console.log(role);
        const companyId = await getCompanyIdByEmail(email);
        console.log(companyId);
        persistSession(role, companyId);
        document.cookie = `companyId=${encodeURIComponent(
          companyId
        )}; path=/; max-age=${7 * 24 * 60 * 60}; Secure; SameSite=Strict`;
        console.log(document.cookie);
      } else if (role === "passenger") {
        persistSession(role, email);
        document.cookie = `email=${encodeURIComponent(
          email
        )}; path=/; max-age=${7 * 24 * 60 * 60}; Secure; SameSite=Strict`;
      }

      notify("Login successful!", "success");
      navigate("/busOwnerDashboard");
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
      {/* Split hero layout to mirror the reference image */}
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
        {/* Left: motion blur hero image (hidden on small screens like the image) */}
        <div
          className="relative hidden lg:block"
          style={{
            backgroundImage: `url('${HERO_IMG}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
        >
          {/* subtle dark overlay for contrast (keeps the same feel as the image) */}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Right: form column */}
        <div className="flex items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-xl">
            {/* Title + subtitle exactly like the reference hierarchy */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Drive Your Journey With BookMyBus
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Take control of your passengers — manage your bus operations
                with ease
              </p>
            </div>

            {/* Card with inputs (blue-900 as the primary accent) */}
            <div className="rounded-2xl border border-gray-200 shadow-sm">
              <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                <div className="space-y-6">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-blue-900/80"
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
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 pl-10 pr-3 rounded-lg border border-gray-300 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900/60 focus:border-blue-900/60 transition"
                        placeholder="your@email.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-blue-900/80"
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
                      </span>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-12 pl-10 pr-3 rounded-lg border border-gray-300 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900/60 focus:border-blue-900/60 transition"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Must include: uppercase, lowercase, number, special
                      character (min 8 chars)
                    </p>
                  </div>

                  {/* Submit */}
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full h-12 rounded-lg font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 ${
                        isSubmitting
                          ? "bg-blue-900/50 cursor-not-allowed"
                          : "bg-blue-900 hover:bg-blue-800"
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
                          Starting...
                        </span>
                      ) : (
                        "Start Journey"
                      )}
                    </button>
                  </div>
                </div>

                {/* “Need help?” footer, matching the card footer vibe */}
                <div className="mt-4 text-sm text-center">
                  <button
                    type="button"
                    onClick={() => setShowSignupOptions((s) => !s)}
                    className="text-blue-900 hover:underline"
                  >
                    Need help?
                  </button>
                </div>
              </form>

              {/* Bottom links styled like lightweight actions under the card */}
              <div className="px-6 sm:px-8 pb-6">
                <div className="flex justify-center items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => navigate("/forgotPassword")}
                    className="text-blue-900 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}

export default CompanyLogin;
