import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";

/**
 * Professional Navbar Component (Simplified)
 * Colors:
 *  Primary: #16A34A (Green)
 *  Secondary: #2563EB (Blue)
 *  Neutral: #F9FAFB (Light Gray)
 */
export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Unified NavLink styling (no active/inactive styles)
  const navLinkClass =
    "px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-white/90 hover:bg-white/10 hover:text-white";

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#2563EB] text-white shadow-lg backdrop-blur-sm bg-opacity-95">
      <div className="mx-auto max-w-7xl">
        {/* Main Navigation Bar */}
        <nav className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
            onClick={closeMobileMenu}
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 group-hover:bg-white/20 transition-all duration-200">
              <img
                src="/bus-icon.jpg"
                alt="leoforeio logo"
                className="h-8 w-8 rounded-full"
              />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              leoforeio
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About Us
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact Us
            </NavLink>
            <NavLink to="/login" className={navLinkClass}>
              Login
            </NavLink>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
          >
            <svg
              className="h-6 w-6 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-white/20 bg-[#2563EB] animate-in slide-in-from-top duration-200"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <NavLink
                to="/"
                className={navLinkClass}
                onClick={closeMobileMenu}
              >
                Home
              </NavLink>
              <NavLink
                to="/about"
                className={navLinkClass}
                onClick={closeMobileMenu}
              >
                About Us
              </NavLink>
              <NavLink
                to="/contact"
                className={navLinkClass}
                onClick={closeMobileMenu}
              >
                Contact Us
              </NavLink>
              <NavLink
                to="/login"
                className={navLinkClass}
                onClick={closeMobileMenu}
              >
                Login
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
