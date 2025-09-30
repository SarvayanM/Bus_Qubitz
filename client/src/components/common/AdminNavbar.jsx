import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";

/**
 * Navbar (React + Tailwind)
 * Props:
 *  - isLoggedIn?: boolean
 *  - userName?: string
 *  - onLogout?: () => void
 *
 * Colors:
 *  Primary   #16A34A
 *  Secondary #2563EB
 *  Neutral   #F9FAFB
 */
export default function AdminNavbar({ isLoggedIn = false, userName = "", onLogout }) {
  const [open, setOpen] = useState(false);

  const linkBase =
    "px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/60";
  const linkClass = ({ isActive }) =>
    `${linkBase} ${isActive ? "bg-white/20" : "hover:bg-white/10"}`;

  const ActionBtn = ({ children, className = "", ...rest }) => (
    <button
      {...rest}
      className={`px-3 py-2 rounded-md text-sm font-semibold transition ${className}`}
    >
      {children}
    </button>
  );

  const handleLogout = () => {
    onLogout?.();
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#2563EB] text-white shadow">
      <nav
        className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between"
        aria-label="Primary"
      >
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/assets/ba.png"
            alt="BusyBus logo"
            className="h-10 w-10 rounded-full"
          />
          <span className="text-base sm:text-lg font-semibold tracking-tight">
            BusyBus
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/about" className={linkClass}>
            About Us
          </NavLink>
          <NavLink to="/buses" className={linkClass}>
            Journeys
          </NavLink>
          <NavLink to="/contact" className={linkClass}>
            Contact Us
          </NavLink>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                to="/profile"
                className="px-3 py-2 rounded-md text-sm font-semibold border border-white/40 hover:bg-white/10"
                title={userName ? `Profile (${userName})` : "Profile"}
              >
                {/* user icon */}
                <span className="inline-flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5Z" />
                  </svg>
                  Profile
                </span>
              </Link>
              <ActionBtn
                onClick={handleLogout}
                className="bg-white text-[#2563EB] hover:opacity-90"
              >
                Logout
              </ActionBtn>
            </>
          ) : (
            <>
              <Link
                to="/sign-up"
                className="px-3 py-2 rounded-md text-sm font-semibold bg-[#16A34A] text-white hover:opacity-90"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                className="px-3 py-2 rounded-md text-sm font-semibold bg-white text-[#2563EB] hover:opacity-90"
              >
                Login
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <ActionBtn
          onClick={() => setOpen((s) => !s)}
          className="md:hidden border border-white/40 hover:bg-white/10"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle navigation"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
            aria-hidden="true"
          >
            {open ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" />
            )}
          </svg>
        </ActionBtn>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-white/20">
          <div className="px-4 pt-3 pb-4 space-y-1">
            <NavLink to="/" className={linkClass} onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink
              to="/about"
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              About Us
            </NavLink>
            <NavLink
              to="/buses"
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              Journeys
            </NavLink>
            <NavLink
              to="/contact"
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              Contact Us
            </NavLink>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isLoggedIn ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center px-3 py-2 rounded-md border border-white/40 hover:bg-white/10"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                    className="flex-1 px-3 py-2 rounded-md bg-white text-[#2563EB] font-semibold hover:opacity-90"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/sign-up"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center px-3 py-2 rounded-md bg-[#16A34A] text-white font-semibold hover:opacity-90"
                  >
                    Sign Up
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center px-3 py-2 rounded-md bg-white text-[#2563EB] font-semibold hover:opacity-90"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
