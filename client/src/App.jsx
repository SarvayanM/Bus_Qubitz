import "./index.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import "react-toastify/dist/ReactToastify.css";
import Cookies from "js-cookie";

// import appBg from "./assets/images/bg.jpg";
import RoleContext from "./components/common/RoleContext";
import { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

import Navbar from "./components/common/Navbar";
import PassengerNavbar from "./components/passenger/PassengerNavbar";
import BusOwnerNavbar from "./components/common/BusOwnerNavbar";
import Journeys from "./components/common/Journeys";
import Footer from "./components/common/Footer";

import Home from "./pages/Home";

import Signup from "./pages/passenger/Signup";
import Login from "./pages/passenger/Login";
import Logout from "./pages/passenger/Logout";
import BusBookingDashboard from "./pages/passenger/BusBookingDashboard";
import UpdateProfile from "./pages/passenger/updateProfile";
import BookingHistory from "./pages/passenger/BookingHistory";
import SelectedBusDetails from "./pages/passenger/SelectedBusDetails";
import CheckoutSummary from "./pages/passenger/CheckoutSummary";

import AddBus from "./pages/admin/AddBus";
import CompanyRegister from "./pages/admin/CompanyRegister";
import BusBookingHistory from "./pages/busOwner/BusBookingHistory";
import ManageBuses from "./pages/admin/ManageBuses";

import CompanyHistory from "./pages/admin/CompanyHistory";
import CompanyLogin from "./pages/busOwner/CompanyLogin";
import BusOwnerDashboard from "./pages/busOwner/BusOwnerDashboard";

function AppContent() {
  const [userRole, setUserRole] = useState("");
  const location = useLocation();

  // Pages that should NOT show the background image
  const NO_BG_PATHS = new Set([
    "/",
    "/about",
    "/contact",
    "/home",
    "/manageBuses",
  ]);
  // Pages that hide the navbar
  const HIDE_NAV_PATHS = new Set(["/login", "/signup", "/forgotPassword"]);

  const pathname = location.pathname;
  const showGlobalBg = !NO_BG_PATHS.has(pathname);
  const hideNavbar = HIDE_NAV_PATHS.has(pathname);

  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      const windowHeight = window.innerHeight || 0;
      const docHeight = document.documentElement.scrollHeight || 0;

      const threshold = 40; // px tolerance for top / bottom

      const atTop = scrollTop <= threshold;
      const atBottom = windowHeight + scrollTop >= docHeight - threshold;

      // 👇 This exactly matches your requirement:
      // - At top:    showDown = true,  showUp = false
      // - At bottom: showDown = false, showUp = true
      // - Middle:    showDown = true,  showUp = true
      setShowScrollDown(!atBottom);
      setShowScrollUp(!atTop);
    };

    // Run once to set initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // keep role in sync with localStorage
  useEffect(() => {
    setUserRole(localStorage.getItem("role"));
  }, [pathname]);

  // If user is logged in and we have a stored userPhone, ensure cookie is set so
  // PhoneAuth and other flows can pick it up (avoids re-verification UX).
  useEffect(() => {
    const phone = localStorage.getItem("userPhone");
    const role = localStorage.getItem("role");
    if (role && phone && !Cookies.get("phone")) {
      Cookies.set("phone", phone, { expires: 30 });
      Cookies.set("phone_verified", "true", { expires: 30 });
    }
  }, [pathname]);

  const roleContextValue = {
    userRole,
    setUserRole: (newRole) => {
      setUserRole(newRole);
      if (newRole) localStorage.setItem("role", newRole);
      else localStorage.removeItem("role");
    },
  };

  return (
    <RoleContext.Provider value={roleContextValue}>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Global Toasts */}
        <Toaster position="top-right" />

        {/* NAVBAR */}
        {!hideNavbar && (
          <header className="sticky top-0 z-50 bg-[#1D1E2C]/95 backdrop-blur-sm">
            {userRole === "passenger" ? (
              <Navbar />
            ) : userRole === "busOwner" ? (
              <BusOwnerNavbar />
            ) : (
              <Navbar />
            )}
          </header>
        )}

        {/* MAIN */}
        <main className={`flex-1 ${hideNavbar ? "" : "pt-6"}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route
              path="/busBookingDashboard"
              element={<BusBookingDashboard />}
            />
            <Route path="/journeys" element={<Journeys />} />
            <Route path="/updateProfile" element={<UpdateProfile />} />
            <Route path="/addBus" element={<AddBus />} />
            <Route path="/companyRegister" element={<CompanyRegister />} />
            <Route path="/busBookingHistory" element={<BusBookingHistory />} />
            <Route path="/manageBuses" element={<ManageBuses />} />
            <Route path="/companyHistory" element={<CompanyHistory />} />
            <Route path="/companyLogin" element={<CompanyLogin />} />
            <Route path="/busOwnerDashboard" element={<BusOwnerDashboard />} />
            <Route path="/bookingHistory" element={<BookingHistory />} />
            <Route
              path="/selectedBusDetails"
              element={<SelectedBusDetails />}
            />
            <Route path="/checkoutSummary" element={<CheckoutSummary />} />
          </Routes>

          <div className="h-8" />
        </main>

        {/* FOOTER */}
        {!hideNavbar && <Footer />}

        {/* Scroll controls (global) */}
        {/* Scroll To Top */}

        {showScrollUp && (
          <motion.button
            type="button"
            aria-label="Scroll to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed right-5 bottom-28 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-900 text-white shadow-lg cursor-pointer hover:bg-blue-800 hover:shadow-2xl active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </motion.button>
        )}

        {/* Scroll To Bottom (only at top) */}
        {showScrollDown && (
          <motion.button
            type="button"
            aria-label="Scroll to bottom"
            onClick={() =>
              window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: "smooth",
              })
            }
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed right-5 bottom-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-900 text-white shadow-lg cursor-pointer hover:bg-blue-800 hover:shadow-2xl active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </motion.button>
        )}
      </div>
    </RoleContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
