import { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import appBg from "../../assets/images/app-bg.jpeg";

/**
 * Forgot Password Page (MERN + Firebase Auth)
 * (styles-only revamp: minimal borders, cursor-pointer, smooth animations)
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Toast helper
  const notify = (message, type = "error") =>
    toast[type](message, {
      position: "top-center",
      autoClose: 3000,
      pauseOnHover: true,
      draggable: true,
      theme: "colored",
    });

  // Handle reset request
  const handleReset = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!EMAIL_RE.test(email)) {
      notify("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    try {
      await sendPasswordResetEmail(getAuth(), email);
      notify("Password reset link sent to your email.", "success");
    } catch (error) {
      const errorMessages = {
        "auth/user-not-found": "No user found with this email.",
        "auth/invalid-email": "Invalid email address.",
      };
      notify(
        errorMessages[error.code] || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: `url(${appBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <main className="flex-grow flex items-center justify-center relative px-4">
          {/* Login Card */}
          <div className="relative w-full max-w-md bg-[#1D1E2C]/95 rounded-xl shadow-2xl overflow-hidden z-10 mt-6 animate-fade-in-up">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-[#1D1E2C] to-[#2a2b3d] p-6 sm:p-8 text-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2DE2E6] to-[#FF6EC7]" />
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2DE2E6] tracking-tight">
                Reset Your Password
              </h1>
              <p className="text-[#2DE2E6]/80 text-sm sm:text-base mt-2">
                We'll send you a link to reset your password
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleReset} className="p-6 sm:p-8 space-y-6">
              {/* Email */}
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-[#2DE2E6] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#2a2b3d] text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6EC7] transition duration-200"
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                      className="h-5 w-5 text-[#2DE2E6]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
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

              {/* Submit */}
              <div className="pt-2 animate-fade-in [animation-delay:80ms]">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-lg cursor-pointer focus:outline-none active:scale-[0.98] ${
                    isSubmitting
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#2DE2E6] to-[#FF6EC7] hover:from-[#25c8cc] hover:to-[#e55db2] hover:shadow-[0_8px_30px_rgba(255,110,199,0.25)]"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
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
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>

              {/* Back */}
              <div className="text-center pt-4 animate-fade-in [animation-delay:160ms]">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="text-[#2DE2E6] font-medium hover:text-[#FF6EC7] text-sm hover:underline rounded px-2 py-1 transition duration-200 cursor-pointer focus:outline-none"
                >
                  Back to Login
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 sm:px-8 pb-6 text-center pt-4 animate-fade-in [animation-delay:220ms]">
              <p className="text-xs text-[#2DE2E6]/70">
                Need help? Contact our{" "}
                <a
                  href="mailto:support@anuthamavilla.com"
                  className="text-[#FF6EC7] hover:underline cursor-pointer"
                >
                  support team
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px) }
          100% { opacity: 1; transform: translateY(0) }
        }
        .animate-fade-in { animation: fade-in .5s ease-out both }
        .animate-fade-in-up { animation: fade-in-up .55s cubic-bezier(.2,.65,.2,1) both }
      `}</style>
    </>
  );
};

export default ForgotPassword;
