import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBuses } from "../api/bus";
import bus1 from "../assets/images/bg.jpg";
import bus2 from "../assets/images/bus5.jpeg";
import bus3 from "../assets/images/bus1.jpg";
import bus4 from "../assets/images/bus11.jpeg";
import bus5 from "../assets/images/bus2.jpg";
import BusLoader from "../components/bus/BusLoader";

/** Utility: yyyy-mm-dd with local timezone (Asia/Colombo) */
function todayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function Home({ userName = "" }) {
  const navigate = useNavigate();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Booking form state
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(todayISO());

  // Form errors
  const [formError, setFormError] = useState("");

  const slides = useMemo(
    () => [
      { src: bus1, alt: "Luxury intercity coach exterior" },
      { src: bus2, alt: "Comfortable seats inside the bus" },
      { src: bus3, alt: "Night service along expressway" },
      { src: bus4, alt: "Premium coach at terminal" },
      { src: bus5, alt: "Luxury bus interior" },
    ],
    []
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        setLoading(true);
        setError("");
        const list = await getBuses();
        setBuses(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err?.message || "Failed to load routes");
        setBuses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBuses();
  }, []);

  /** Unique set of all locations from DB (both route.from and route.to) */
  const locations = useMemo(() => {
    const set = new Set();
    for (const b of buses) {
      const f = b?.route?.from?.trim();
      const t = b?.route?.to?.trim();
      if (f) set.add(f);
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [buses]);

  // Keep a clean error state on field changes
  useEffect(() => {
    setFormError("");
  }, [from, to, date]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  /** Validate & submit */
  const handleSearch = (e) => {
    e.preventDefault();

    if (!from || !to || !date) {
      return setFormError("Please select From, To and a valid Date.");
    }
    if (from === to) {
      return setFormError("From and To cannot be the same location.");
    }

    // Validate date >= today
    const selected = new Date(date);
    const min = new Date(todayISO());
    if (selected < min) {
      return setFormError("Please choose a date that is today or later.");
    }

    // Navigate with query params
    const params = new URLSearchParams({ from, to, date }).toString();
    navigate(`/selectedBusDetails?${params}`);
  };

  useEffect(() => {
    const selector = [
      ".animate-fly-in-from-top",
      ".animate-fly-in-from-bottom",
      ".animate-fly-in-from-left",
      ".animate-fly-in-from-right",
    ].join(",");

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            // entering viewport → add class to start animation
            el.classList.add("in-view");
          } else {
            // leaving viewport → remove so it can retrigger on the next entry
            el.classList.remove("in-view");
          }
        });
      },
      {
        // Slight hysteresis to avoid flicker near fold
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    const scan = () => {
      document.querySelectorAll(selector).forEach((el) => io.observe(el));
    };

    // initial scan
    scan();

    // watch for async-rendered content (e.g., after getBuses())
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    // ensure we catch nodes rendered this tick
    const raf = requestAnimationFrame(scan);

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [buses.length]); // rescan when cards count changes

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Hero Section */}
      <section className="relative h-[92vh] overflow-hidden">
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-in-out ${
                index === currentSlide
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-105"
              }`}
            />
          ))}
        </div>

        {/* Enhanced gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-gray-900/40 to-transparent" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-4">
          <div className="max-w-4xl animate-fade-in-up mb-8">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3  border border-white/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white/90">
                Welcome to BookMyBus
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold  mt-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent leading-tight">
              Ride Smart.
              <br />
              <span className="bg-gradient-to-r from-blue-200 to-emerald-200 bg-clip-text text-transparent">
                Travel Easy.
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-blue-100 mb-6 font-light max-w-2xl mx-auto">
              Reserve Your Seat with Confidence and Comfort
            </p>
          </div>

          {/* Enhanced Booking Card */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-5xl bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-8 mb-8 text-left transform hover:scale-[1.01] transition-all duration-500 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Book Your Journey
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
              {/* From */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Departure From
                </label>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-14 rounded-xl border-2 border-gray-200 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md font-medium"
                >
                  <option value="" className="text-gray-400">
                    Select departure city
                  </option>
                  {locations.map((loc) => (
                    <option key={`from-${loc}`} value={loc} className="py-2">
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* To */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  Destination To
                </label>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-14 rounded-xl border-2 border-gray-200 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md font-medium"
                >
                  <option value="" className="text-gray-400">
                    Select destination city
                  </option>
                  {locations.map((loc) => (
                    <option
                      key={`to-${loc}`}
                      value={loc}
                      disabled={loc === from}
                      className={`py-2 ${loc === from ? "text-gray-400" : ""}`}
                    >
                      {loc} {loc === from && "(Selected)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Travel Date
                </label>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-14 rounded-xl border-2 border-gray-200 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md [color-scheme:light] font-medium"
                />
              </div>

              {/* Submit */}
              <div className="flex lg:justify-end">
                <button
                  type="submit"
                  className="w-full lg:w-auto bg-blue-900 hover:from-blue-700 text-white font-semibold h-14 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 group"
                >
                  <svg
                    className="w-5 h-5 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Search Buses{" "}
                  {userName && (
                    <span className="font-normal">for {userName}</span>
                  )}
                </button>
              </div>
            </div>

            {formError && (
              <div className="mt-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-shake flex items-center gap-3">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">{formError}</span>
              </div>
            )}
          </form>

          {/* Enhanced Slide Controls */}
          <div
            className="absolute bottom-6 flex items-center gap-6 animate-fade-in-up"
            style={{ animationDelay: "0.6s" }}
          >
            <button
              onClick={prevSlide}
              className="bg-white/20 hover:bg-white/30 p-4 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm border border-white/30"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>

            <div className="flex gap-3">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 transform hover:scale-125 ${
                    index === currentSlide
                      ? "bg-white scale-125 shadow-lg"
                      : "bg-white/70 hover:bg-white/90"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="bg-white/20 hover:bg-white/30 p-4 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm border border-white/30"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Exclusive Journeys Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 ">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fly-in-from-top">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4 animate-fly-in-from-left">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Premium Services
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 animate-fly-in-from-right">
              Exclusive Journey Collection
            </h2>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed animate-fly-in-from-bottom">
              Curated premium routes offering exceptional comfort, reliability,
              and service excellence across Sri Lanka.
            </p>
          </div>

          {loading ? (
            <BusLoader
              message="Loading journeys..."
              subtext="Fetching exclusive journeys"
              height="h-72"
              className="mx-auto max-w-6xl"
            />
          ) : error ? (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl py-12 px-8 max-w-md mx-auto shadow-lg">
                <svg
                  className="w-16 h-16 text-red-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-red-700 text-lg font-medium mb-2">
                  Service Unavailable
                </p>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          ) : buses.length === 0 ? (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl py-16 px-8 max-w-md mx-auto">
                <svg
                  className="w-16 h-16 text-blue-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-gray-700 text-lg font-medium mb-2">
                  No Journeys Available
                </p>
                <p className="text-gray-600">
                  Check back later for new premium routes.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {buses.map((bus, index) => (
                <ExclusiveCard key={bus._id || index} bus={bus} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 text-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-4 shadow-sm border border-gray-200 animate-fly-in-from-left">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Why Choose Us
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 animate-fly-in-from-right">
              Excellence in Every Journey
            </h2>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed animate-fly-in-from-bottom">
              Discover why thousands of travelers trust BookMyBus for their
              intercity travel needs.
            </p>
          </div>

          <div
            className="flex justify-center mb-16 animate-fly-in-from-top"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="max-w-4xl text-center">
              <p className="text-gray-700 text-lg sm:text-xl leading-relaxed bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                Experience Sri Lanka's premier luxury bus service, offering
                ergonomic seating, punctual departures, and premium amenities
                for a safe and relaxing journey across the island. Enjoy
                hassle-free travel while exploring scenic routes and connecting
                cities with unparalleled ease and comfort.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <FeatureCard
              title="Island-Wide Coverage"
              description="Extensive network covering 7,500+ cities & villages with real-time tracking and optimized routes."
              icon="📍"
              delay="0.4s"
            />
            <FeatureCard
              title="Comfort & Safety"
              description="Modern A/C fleet, verified professional drivers, live GPS tracking, and premium onboard amenities."
              icon="🛡️"
              delay="0.6s"
            />
            <FeatureCard
              title="Instant Booking"
              description="Digital tickets in seconds with flexible cancellation and 24/7 customer support."
              icon="⚡"
              delay="0.8s"
            />
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
            <StatCard number="50K+" label="Happy Travelers" delay="1s" />
            <StatCard number="150+" label="Daily Routes" delay="1.2s" />
            <StatCard number="99%" label="On-Time Performance" delay="1.4s" />
            <StatCard number="24/7" label="Customer Support" delay="1.6s" />
          </div>
        </div>
      </section>
    </div>
  );
}

/** Enhanced Exclusive Card Component */
function ExclusiveCard({ bus, index }) {
  const {
    busName = "",
    route = {},
    type = "Standard",
    frequency = "Regular",
    imageUrl = bus1,
  } = bus || {};
  const { from = "—", to = "—" } = route || {};

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden animate-fly-in-from-bottom hover:scale-[1.02]"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="relative overflow-hidden">
        <img
          src={imageUrl}
          alt={`${from} to ${to}`}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

        {/* Enhanced Badges */}
        <div className="absolute top-4 left-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg">
          {type}
        </div>
        <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg">
          {frequency}
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
          {from} <span className="text-gray-400 mx-2">→</span> {to}
        </h3>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 flex items-center gap-2 font-medium">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-2H9v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2a2 2 0 01-2-2V5zM6 9h12M6 13h12M8.5 17a.5.5 0 100 1 .5.5 0 000-1zm7 0a.5.5 0 100 1 .5.5 0 000-1z"
              />
            </svg>
            {busName || "Premium Coach"}
          </p>

          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            Available
          </div>
        </div>
      </div>
    </div>
  );
}

/** Enhanced Feature Card Component */
function FeatureCard({ title, description, icon, delay }) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] animate-fly-in-from-bottom group"
      style={{ animationDelay: delay }}
    >
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-gray-700 leading-relaxed text-lg font-normal">
        {description}
      </p>
    </div>
  );
}

/** New Stat Card Component */
function StatCard({ number, label, delay }) {
  return (
    <div
      className="text-center animate-fly-in-from-bottom"
      style={{ animationDelay: delay }}
    >
      <div className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
        {number}
      </div>
      <div className="text-gray-600 font-medium">{label}</div>
    </div>
  );
}
