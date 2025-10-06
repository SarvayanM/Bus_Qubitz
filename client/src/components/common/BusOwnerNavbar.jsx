import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";

export default function BusOwnerNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <NavLink
              to="/"
              className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
            >
              Home
            </NavLink>

            <NavLink
              to="/addBus"
              className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
            >
              Add Bus
            </NavLink>
            <NavLink
              to="/manageBuses"
              className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
            >
              Manage Buses
            </NavLink>
            <NavLink
              to="/busBookingHistory"
              className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
            >
              Booking History
            </NavLink>
            <NavLink
              to="/logout"
              className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
            >
              Logout
            </NavLink>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-white/40 text-white hover:bg-white/10 transition-all duration-200"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
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
                className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
                onClick={closeMobileMenu}
              >
                Home
              </NavLink>
              <NavLink
                to="/dashboard"
                className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
                onClick={closeMobileMenu}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/buses"
                className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
                onClick={closeMobileMenu}
              >
                Manage Buses
              </NavLink>
              <NavLink
                to="/bookings"
                className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
                onClick={closeMobileMenu}
              >
                Bookings
              </NavLink>
              <NavLink
                to="/logout"
                className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white"
                onClick={closeMobileMenu}
              >
                Logout
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
