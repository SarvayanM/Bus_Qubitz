import React, { useState, useEffect, useContext } from "react";
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
  const [passengerName, setPassengerName] = useState("");
  const [passengerFirstName, setPassengerFirstName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const { userRole, setUserRole } = useContext(RoleContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Header shadow on scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  // Fetch passenger name if logged-in passenger
  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      setPassengerName("");
      setPassengerFirstName("");
      const phone = Cookies.get("phone");
      if (!userRole || userRole !== "passenger" || !phone) return;
      setLoadingProfile(true);
      try {
        const p = await getPassengerByPhone(phone);
        if (mounted && p) {
          const full =
            `${p.fname || ""}${p.lname ? " " + p.lname : ""}`.trim() || phone;
          setPassengerName(full);
          // Prefer explicit first name; fall back to first token
          const first =
            (p.fname && String(p.fname).trim()) || full.split(" ")[0] || "";
          setPassengerFirstName(first);
        }
      } catch (_) {
        // silent
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, [userRole]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Animations
  const navVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
        duration: 0.5,
      },
    },
  };
  const mobileMenuVariants = {
    closed: { opacity: 0, x: "100%", transition: { duration: 0.25 } },
    open: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.35,
      },
    },
  };
  const itemVariants = {
    closed: { x: 12, opacity: 0 },
    open: (i) => ({
      x: 0,
      opacity: 1,
      transition: { delay: i * 0.08, duration: 0.25 },
    }),
  };

  // Common logout action
  const doLogout = () => {
    Cookies.remove("phone");
    Cookies.remove("phone_verified");
    localStorage.removeItem("role");
    setUserRole("");
    closeMobileMenu();
    navigate("/");
  };

  return (
    <motion.header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-white ${
        isScrolled ? "shadow-lg" : "shadow-sm"
      }`}
      initial="hidden"
      animate="visible"
      variants={navVariants}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Row: Left = Logo, Middle = Nav, Right = Profile cluster */}
        <div className="flex h-16 items-center">
          {/* Left: Brand (logo locked to far left) */}
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Link
              to="/"
              className="flex items-center gap-3"
              onClick={closeMobileMenu}
            >
              <div className="p-2 rounded-xl bg-white flex items-center justify-center ">
                <img
                  src="src/assets/images/bus-logo-2.png"
                  alt="Bus Logo"
                  className="w-15 h-12 object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-blue-900">
                Leoforeio
              </span>
            </Link>
          </motion.div>

          {/* Center: Desktop Navigation (all other elements) */}
          <nav className="hidden md:flex items-center gap-1 ml-6 flex-1">
            {navItems.map((item) => (
              <motion.div
                key={item.path}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-blue-900 text-white"
                        : "text-slate-900 hover:bg-blue-100"
                    }`
                  }
                >
                  {item.icon}
                  <span className="font-semibold">{item.label}</span>
                </NavLink>
              </motion.div>
            ))}
          </nav>

          {/* Right: Passenger first name + profile icon (click to profile) + logout */}
          <div className="ml-auto hidden md:flex items-center gap-3">
            {userRole === "passenger" ? (
              <>
                <span className="text-sm font-semibold text-slate-900">
                  {loadingProfile ? "..." : passengerFirstName || "Profile"}
                </span>

                <button
                  type="button"
                  onClick={() => navigate("/updateProfile")}
                  className="p-2 rounded-xl bg-slate-100 ring-1 ring-slate-200 hover:bg-blue-100 transition cursor-pointer"
                  aria-label="Open profile"
                  title="Profile"
                >
                  <FaUser className="text-lg text-blue-700" />
                </button>

                <button
                  className="flex items-center gap-3 w-full rounded-xl px-4 py-2 text-white font-semibold border border-red-200 bg-red-500 text-white hover:bg-red-400 transition cursor-pointer"
                  onClick={doLogout}
                  aria-label="Logout"
                  title="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="ml-2 flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-slate-900 hover:bg-blue-100 transition cursor-pointer"
              >
                <FaSignInAlt className="text-lg" />
                <span className="font-semibold">Login</span>
              </NavLink>
            )}

            {/* Mobile Menu Button (visible only on small screens; hidden on md+) */}
            <motion.button
              className="md:hidden p-2 rounded-lg text-slate-900 hover:bg-slate-100 transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              whileTap={{ scale: 0.95 }}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <HiX className="text-2xl" />
              ) : (
                <HiMenuAlt3 className="text-2xl" />
              )}
            </motion.button>
          </div>

          {/* On mobile, keep the hamburger on the far right */}
          <motion.button
            className="md:hidden ml-auto p-2 rounded-lg text-slate-900 hover:bg-slate-100 transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            whileTap={{ scale: 0.95 }}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <HiX className="text-2xl" />
            ) : (
              <HiMenuAlt3 className="text-2xl" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Mobile Fullscreen Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav
            id="mobile-menu"
            className="fixed inset-0 z-40 md:hidden bg-white"
            variants={mobileMenuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            role="dialog"
            aria-modal="true"
          >
            {/* Top bar inside the sheet */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-blue-200">
              <span className="sr-only">Mobile navigation</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-auto p-2 rounded-lg text-slate-900 hover:bg-blue-100 transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <HiX className="text-2xl" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="bg-white px-4 py-6">
              <div className="space-y-2">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    custom={index}
                    variants={itemVariants}
                    initial="closed"
                    animate="open"
                  >
                    <NavLink
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 w-full rounded-xl px-4 py-4 text-base font-semibold border cursor-pointer",
                          "focus:outline-none focus:ring-2 focus:ring-blue-200",
                          isActive
                            ? "bg-blue-900 text-white border-blue-900"
                            : "bg-white text-slate-900 hover:bg-blue-50 border-slate-200",
                        ].join(" ")
                      }
                    >
                      <span
                        className={`text-lg ${
                          location.pathname === item.path
                            ? "opacity-100"
                            : "opacity-70"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </div>

              {/* Mobile Auth Area */}
              <div className="mt-6 border-t border-slate-200 pt-6">
                {userRole === "passenger" ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate("/updateProfile");
                      }}
                      className="flex items-center gap-3 w-full rounded-xl px-4 py-3 border border-slate-200 bg-slate-50 hover:bg-blue-50 transition cursor-pointer"
                      aria-label="Open profile"
                      title="Profile"
                    >
                      <FaUser className="text-lg text-blue-700" />
                      <div className="font-semibold text-sm text-slate-900">
                        {loadingProfile
                          ? "..."
                          : passengerFirstName || "Profile"}
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        doLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full rounded-xl px-4 py-2 text-white font-semibold border border-red-200 bg-red-500 text-white hover:bg-red-400 transition cursor-pointer"
                    >
                      <FaSignOutAlt />
                      Logout
                    </button>
                  </div>
                ) : (
                  <NavLink
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 w-full rounded-xl px-4 py-4 text-base font-semibold border border-slate-200 bg-white text-slate-900 hover:bg-blue-50 transition cursor-pointer"
                  >
                    <FaSignInAlt />
                    Login
                  </NavLink>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
