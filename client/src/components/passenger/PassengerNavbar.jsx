// frontend/src/components/PassengerNavbar.jsx
import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FaHome, FaUser, FaBus, FaSignOutAlt, FaWallet } from "react-icons/fa";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

export default function PassengerNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Shadow on scroll (navbar stays white)
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Desktop + mobile nav config (includes Wallet)
  const navItems = [
    { path: "/", label: "Home", icon: <FaHome className="text-lg" /> },
    {
      path: "/updateProfile",
      label: "Profile",
      icon: <FaUser className="text-lg" />,
    },
    {
      path: "/busBookingDashboard",
      label: "Book Bus",
      icon: <FaBus className="text-lg" />,
    },
    {
      path: "/wallet",
      label: "Wallet",
      icon: <FaWallet className="text-lg" />,
    },
    {
      path: "/logout",
      label: "Logout",
      icon: <FaSignOutAlt className="text-lg" />,
    },
  ];

  // Animations (matching Navbar.jsx vibe)
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
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
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
              <div className="p-2 rounded-xl bg-white flex items-center justify-center">
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

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <motion.div
                key={item.path}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-blue-900 text-white"
                        : "text-black hover:bg-blue-100"
                    }`
                  }
                >
                  {item.icon}
                  <span className="font-semibold">{item.label}</span>
                </NavLink>
              </motion.div>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden p-2 rounded-lg text-black hover:bg-gray-100 transition-colors duration-200"
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
            {/* Top bar inside sheet */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-blue-200">
              <span className="sr-only">Passenger mobile navigation</span>
              <button
                onClick={closeMobileMenu}
                className="ml-auto p-2 rounded-lg text-black hover:bg-blue-100 transition-colors"
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
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 w-full",
                          "rounded-xl px-4 py-4",
                          "text-base font-semibold",
                          "border border-gray-200",
                          "focus:outline-none focus:ring-2 focus:ring-blue-200",
                          isActive
                            ? "bg-blue-900 text-white border-blue-900"
                            : "bg-white text-black hover:bg-blue-50",
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
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
