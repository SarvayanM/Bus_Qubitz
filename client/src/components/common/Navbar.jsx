// src/components/Navbar.jsx
import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaInfoCircle,
  FaPhoneAlt,
  FaSignInAlt,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import RoleContext from "./RoleContext";
import Cookies from "js-cookie";
import { getPassengerByPhone } from "../../api/passenger";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [passengerFirstName, setPassengerFirstName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const { userRole, setUserRole } = useContext(RoleContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll shadow
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchProfile = useCallback(async () => {
    const phone = Cookies.get("phone");
    if (!phone || userRole !== "passenger") return;
    setLoadingProfile(true);
    try {
      const p = await getPassengerByPhone(phone);
      if (p?.fname) setPassengerFirstName(p.fname);
    } catch {
      // silent
    } finally {
      setLoadingProfile(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const doLogout = () => {
    Cookies.remove("phone");
    Cookies.remove("phone_verified");
    localStorage.removeItem("role");
    setUserRole("");
    setPassengerFirstName("");
    navigate("/");
  };

  const navItems = [
    { path: "/", label: "Home", icon: <FaHome className="text-lg" /> },
    {
      path: "/selectedBusDetails",
      label: "Journeys",
      icon: <FaInfoCircle className="text-lg" />,
    },
    {
      path: "/about",
      label: "About Us",
      icon: <FaInfoCircle className="text-lg" />,
    },
    {
      path: "/contact",
      label: "Contact Us",
      icon: <FaPhoneAlt className="text-lg" />,
    },
  ];

  if (userRole === "passenger") {
    navItems.push({
      path: "/bookingHistory",
      label: "Booking History",
      icon: <FaInfoCircle className="text-lg" />,
    });
  }

  return (
    <motion.header
      className={`fixed top-0 inset-x-0 z-50 bg-white transition-all duration-300 ${
        isScrolled ? "shadow-lg" : "shadow-sm"
      }`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Outer container: left (logo), center (nav), right (actions) */}
        <div className="flex items-center justify-between h-16 w-full">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="src/assets/images/bus-logo-2.png"
              alt="Bus Logo"
              className="w-12 h-10 object-contain"
            />
            <span className="text-2xl font-bold text-blue-900 tracking-tight">
              BookMyBus
            </span>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-900 text-white"
                      : "text-slate-900 hover:bg-blue-100"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Profile / Auth */}
          <div className="hidden md:flex items-center gap-3">
            {userRole === "passenger" ? (
              <>
                <span className="text-sm font-semibold text-slate-900">
                  {loadingProfile ? "..." : passengerFirstName || "Profile"}
                </span>
                <button
                  onClick={() => navigate("/updateProfile")}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 ring-1 ring-slate-200 transition"
                  aria-label="Profile"
                >
                  <FaUser className="text-blue-700 text-lg" />
                </button>
                <button
                  onClick={doLogout}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-400 font-semibold transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-slate-900 hover:bg-blue-100 transition"
              >
                <FaSignInAlt className="text-lg" />
                Login
              </NavLink>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-900 hover:bg-slate-100 transition"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <HiX className="text-2xl" />
            ) : (
              <HiMenuAlt3 className="text-2xl" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav
            className="md:hidden bg-white border-t border-slate-200 shadow-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex flex-col p-4 space-y-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 font-semibold ${
                      isActive
                        ? "bg-blue-900 text-white"
                        : "bg-slate-50 text-slate-900 hover:bg-blue-50"
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
              {userRole === "passenger" ? (
                <>
                  <button
                    onClick={() => navigate("/updateProfile")}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold bg-slate-50 hover:bg-blue-50"
                  >
                    <FaUser className="text-blue-700" />
                    {loadingProfile ? "..." : passengerFirstName || "Profile"}
                  </button>
                  <button
                    onClick={doLogout}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-white bg-red-500 hover:bg-red-400"
                  >
                    <FaSignOutAlt />
                    Logout
                  </button>
                </>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold bg-slate-50 hover:bg-blue-50"
                >
                  <FaSignInAlt />
                  Login
                </NavLink>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
