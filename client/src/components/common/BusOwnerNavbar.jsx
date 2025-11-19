// src/components/BusOwnerNavbar.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaBus,
  FaClipboardList,
  FaChartBar,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import Cookies from "js-cookie";
import { fetchCompanyProfile } from "../../api/company";

// ✅ Reuse the same logo as passenger navbar
import busLogo from "../../assets/images/bus-logo-2.png";

export default function BusOwnerNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [loadingCompany, setLoadingCompany] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Scroll shadow (same behavior as Navbar.jsx)
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch company profile using companyId stored in cookies
  const fetchCompany = useCallback(async () => {
    const companyId = Cookies.get("companyId"); // 🔑 assumes you stored this at login
    if (!companyId) return;

    setLoadingCompany(true);
    try {
      // You can adjust the call depending on your API signature
      const company = await fetchCompanyProfile(companyId);
      if (company?.companyName) setCompanyName(company.companyName);
    } catch (err) {
      // silent fail is fine for navbar
      console.error("Failed to fetch company profile", err);
    } finally {
      setLoadingCompany(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const doLogout = () => {
    Cookies.remove("companyId");
    Cookies.remove("company_logged_in");
    localStorage.removeItem("role");
    // Any other bus-owner related cookies can be cleared here

    navigate("/"); // or "/busOwner/login" depending on your routing
  };

  // Center nav items (desktop + mobile)
  const navItems = [
    {
      path: "/busOwnerDashboard",
      label: "Dashboard",
      icon: <FaChartBar className="text-lg" />,
    },
    {
      path: "/manageBuses",
      label: "Manage Buses",
      icon: <FaBus className="text-lg" />,
    },
    {
      path: "/busBookingHistory",
      label: "Booking History",
      icon: <FaClipboardList className="text-lg" />,
    },
  ];

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
              src={busLogo}
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

          {/* Right: Company Profile / Logout */}
          <div className="hidden md:flex items-center gap-3">
            {/* Company name next to profile icon */}
            <span className="text-sm font-semibold text-slate-900">
              {loadingCompany ? "Loading..." : companyName || "Bus Company"}
            </span>

            <button
              
              className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 ring-1 ring-slate-200 transition"
              aria-label="Company Profile"
            >
              <FaUser className="text-blue-700 text-lg" />
            </button>

            <button
              onClick={doLogout}
              className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-400 font-semibold transition flex items-center gap-2"
            >
              <FaSignOutAlt />
              Logout
            </button>
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

              {/* Company name + profile + logout in mobile */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/busOwner/profile");
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold bg-slate-50 hover:bg-blue-50"
              >
                <FaUser className="text-blue-700" />
                {loadingCompany ? "Loading..." : companyName || "Bus Company"}
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  doLogout();
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-white bg-red-500 hover:bg-red-400"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
