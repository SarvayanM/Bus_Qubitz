import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBuses } from "../api/bus";
import bus1 from "../assets/images/bg.jpg";
import bus2 from "../assets/images/bus5.jpeg";
import bus3 from "../assets/images/bus1.jpg";
import bus4 from "../assets/images/bus11.jpeg";
import bus5 from "../assets/images/bus2.jpg";

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

  return (
    <div className="min-h-screen bg-white text-gray-900">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 to-transparent" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-4">
          <div className="max-w-4xl animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Ride Smart. Travel Easy.
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-6 font-light">
              Reserve Your Seat Today
            </p>
            <p className="text-lg text-blue-50 mb-10 max-w-2xl mx-auto leading-relaxed">
              Fast, easy bookings — island-wide coverage with premium comfort
              and exceptional service.
            </p>
          </div>

          {/* Booking bar (From / To / Date) */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-6 sm:p-8 text-left transform hover:scale-[1.01] transition-all duration-500 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* From */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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
                  From
                </label>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-12 rounded-xl border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                >
                  <option value="">Select origin</option>
                  {locations.map((loc) => (
                    <option key={`from-${loc}`} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* To */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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
                  To
                </label>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-12 rounded-xl border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                >
                  <option value="">Select destination</option>
                  {locations.map((loc) => (
                    <option
                      key={`to-${loc}`}
                      value={loc}
                      disabled={loc === from}
                    >
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 rounded-xl border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md [color-scheme:light]"
                />
              </div>

              {/* Submit */}
              <div className="flex md:justify-end">
                <button
                  type="submit"
                  className="w-full md:w-auto bg-blue-900 hover:bg-blue-1000 text-white font-semibold h-12 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 group"
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
                  Search Buses {userName && `, ${userName}`}!
                </button>
              </div>
            </div>

            {formError && (
              <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-shake flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {formError}
              </div>
            )}
          </form>

          {/* Slide Controls */}
          <div
            className="absolute bottom-8 flex items-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.6s" }}
          >
            <button
              onClick={prevSlide}
              className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm"
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
                      ? "bg-blue-400 scale-125"
                      : "bg-white/70 hover:bg-white"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-all duration-300 transform hover:scale-110 backdrop-blur-sm"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Exclusive Journeys (static showcase) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Exclusive Journey with Our Bus
            </h2>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
              A hand-picked selection of premium services curated for comfort
              and reliability.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="h-80 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse border border-gray-300"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl py-8 px-6 max-w-md mx-auto shadow-lg">
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
                <p className="text-red-700 text-lg font-medium">{error}</p>
              </div>
            </div>
          ) : buses.length === 0 ? (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl py-12 px-6 max-w-md mx-auto">
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
                <p className="text-gray-600 text-lg">
                  No exclusive journeys available at the moment.
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

      {/* Features Section (kept, restyled to white/blue) */}
      <section className="py-20 bg-white text-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Why Choose leoforeio?
            </h2>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Discover hidden gems across the island with convenient,
              affordable, and culturally immersive rides that redefine travel
              excellence.
            </p>
          </div>

          <div
            className="flex justify-center mb-16 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="max-w-4xl text-center">
              <p className="text-gray-700 text-lg sm:text-xl leading-relaxed bg-white rounded-2xl p-8 border border-gray-200">
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
              description="7,500+ cities & villages with extensive route network and real-time tracking."
              icon="📍"
              delay="0.4s"
            />
            <FeatureCard
              title="Comfort & Safety"
              description="Modern A/C buses, verified drivers, live tracking, and premium amenities."
              icon="🛡️"
              delay="0.6s"
            />
            <FeatureCard
              title="Instant Booking"
              description="Digital tickets in seconds with easy cancellation and 24/7 support."
              icon="⚡"
              delay="0.8s"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/** Exclusive static card: image, bus name, route, type, frequency (no CTA) */
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
      className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="relative overflow-hidden">
        <img
          src={imageUrl}
          alt={`${from} to ${to}`}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-full shadow">
          {type}
        </div>
        <div className="absolute top-4 right-4 bg-sky-600 text-white text-xs font-semibold px-3 py-2 rounded-full shadow">
          {frequency}
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {from} <span className="text-black-700 mx-2">-</span> {to}
        </h3>

        <p className="text-sm text-gray-600 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-2H9v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2a2 2 0 01-2-2V5zM6 9h12M6 13h12M8.5 17a.5.5 0 100 1 .5.5 0 000-1zm7 0a.5.5 0 100 1 .5.5 0 000-1z"
            />
          </svg>

          {busName || "Premium Service"}
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon, delay }) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg animate-fade-in-up group"
      style={{ animationDelay: delay }}
    >
      <div className="text-4xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-700 leading-relaxed text-lg">{description}</p>
    </div>
  );
}
