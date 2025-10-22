import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FaUser, FaBus, FaHome, FaSignOutAlt } from "react-icons/fa";
import { motion } from "framer-motion";

export default function PassengerNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Home", icon: <FaHome /> },
    { path: "/updateProfile", label: "Profile", icon: <FaUser /> },
    { path: "/busBookingDashboard", label: "Book Bus", icon: <FaBus /> },
    { path: "/logout", label: "Logout", icon: <FaSignOutAlt /> },
  ];

  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/bus-logo.png"
            alt="Logo"
            className="w-12 h-12 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-800 tracking-wide">
            Leoforeio
          </h1>
        </Link>

        {/* Animated Bus */}
        <div className="relative w-48 h-10 hidden md:flex justify-center overflow-hidden">
          <motion.img
            src="/bus-icon.png"
            alt="Bus"
            className="absolute bottom-0 w-10 h-10"
            initial={{ x: -200 }}
            animate={{ x: 200 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-6 items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 text-gray-700 font-medium hover:text-blue-600 transition-colors duration-200 ${
                  isActive ? "text-blue-600 border-b-2 border-blue-600" : ""
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-700 text-2xl focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg border-t border-gray-200">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-6 py-3 text-gray-700 font-medium hover:bg-blue-50 transition-colors duration-200 ${
                  isActive ? "text-blue-600 bg-blue-50" : ""
                }`
              }
            >
              <div className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
