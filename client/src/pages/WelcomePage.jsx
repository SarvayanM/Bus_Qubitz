import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBuses } from "../api/bus";
import bus1 from "../assets/images/bus1.jpg";
import bus2 from "../assets/images/bus2.jpg";
import bus3 from "../assets/images/bus3.jpg";
import bus4 from "../assets/images/bus4.jpg";

export default function WelcomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const slides = useMemo(
    () => [
      { src: bus1, alt: "Luxury intercity coach exterior" },
      { src: bus2, alt: "Comfortable seats inside the bus" },
      { src: bus3, alt: "Night service along expressway" },
      { src: bus4, alt: "Premium coach at terminal" },
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

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 mt-16">
      {/* Hero Section */}
      <section className="relative h-[92vh] overflow-hidden">
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Ride Smart. Travel Easy.
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 mb-8">
            Reserve Your Seat Today
          </p>
          <p className="text-lg mb-8 max-w-2xl">
            Fast, easy bookings — island-wide coverage with premium comfort.
          </p>

          {/* Slide Controls */}
          <div className="absolute bottom-6 flex items-center gap-4">
            <button
              onClick={prevSlide}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all"
              aria-label="Previous slide"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>

            <div className="flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentSlide
                      ? "bg-[#2563EB]"
                      : "bg-white/70 hover:bg-white"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all"
              aria-label="Next slide"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Routes Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2563EB] mb-4">
              Popular Routes
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Experience comfort and convenience with our premium fleet across
              major destinations.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="h-80 rounded-xl bg-white border border-[#2563EB]/20 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg py-4 px-6 max-w-md mx-auto">
                {error}
              </div>
            </div>
          ) : buses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No routes available at the moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {buses.map((bus) => (
                <BusCard key={bus._id} bus={bus} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2563EB] mb-4">
              Why Choose leoforeio?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Discover hidden gems across the island with convenient,
              affordable, and culturally immersive rides.
            </p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="max-w-2xl text-center">
              <p className="text-gray-700 text-lg sm:text-xl">
                Experience Sri Lanka’s luxury bus service, offering comfortable
                seating, punctual departures, and premium amenities for a safe
                and relaxing journey across the island. Enjoy hassle-free travel
                while exploring scenic routes and connecting cities with ease.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <FeatureCard
              title="Island-Wide Coverage"
              description="7,500+ cities & villages with extensive route network."
              icon="📍"
            />
            <FeatureCard
              title="Comfort & Safety"
              description="Modern A/C buses, verified drivers, and live tracking."
              icon="🛡️"
            />
            <FeatureCard
              title="Instant Booking"
              description="Digital tickets in seconds with easy cancellation."
              icon="⚡"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function BusCard({ bus }) {
  const {
    _id: id,
    busName = "",
    route = {},
    schedule = {},
    seats = 0,
    price = 0,
    type = "Standard",
    frequency = "Regular",
    pickups = [],
    busNo = "N/A",
    imageUrl = bus1,
  } = bus;

  const { from = "—", to = "—" } = route;
  const { departure = "—", arrival = "—", nextDayArrival = false } = schedule;

  return (
    <div className="bg-white rounded-xl border border-[#2563EB]/20 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <div className="relative">
        <img
          src={imageUrl}
          alt={`${from} to ${to}`}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 left-3 bg-[#16A34A] text-white text-xs font-semibold px-3 py-1 rounded-full">
          {type}
        </div>
        <div className="absolute top-3 right-3 bg-[#2563EB] text-white text-xs font-semibold px-3 py-1 rounded-full">
          {frequency}
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {from} <span className="text-[#2563EB]">→</span> {to}
          </h3>
          <p className="text-gray-600 text-sm">
            Bus Name: <span className="font-semibold">{busName}</span>
          </p>
          <p className="text-gray-600 text-sm">
            Bus No: <span className="font-semibold">{busNo}</span>
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Departure</p>
            <p className="font-semibold text-gray-900">{departure}</p>
          </div>
          <div className="flex-1 mx-4 h-1 bg-gradient-to-r from-[#2563EB] to-[#16A34A] rounded" />
          <div className="text-center">
            <p className="text-gray-500 text-sm">Arrival</p>
            <p className="font-semibold text-gray-900">
              {arrival}
              {nextDayArrival && (
                <span className="text-xs text-gray-500 ml-1">(+1d)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-600">
            Available Seats:{" "}
            <span className="font-semibold text-gray-900">{seats}</span>
          </div>
          <div className="text-2xl font-bold text-[#16A34A]">
            Rs {Number(price).toFixed(2)}
          </div>
        </div>

        {pickups.length > 0 && (
          <div className="mb-4">
            <p className="text-gray-500 text-sm font-semibold mb-2">
              Pick-up Points
            </p>
            <div className="grid grid-cols-2 gap-2">
              {pickups.slice(0, 4).map((pickup, index) => (
                <div
                  key={index}
                  className="bg-[#F9FAFB] border border-[#2563EB]/20 rounded px-2 py-1 text-xs"
                >
                  <span className="font-medium">{pickup.place}</span>
                  <span className="text-gray-500 ml-1">{pickup.time}</span>
                </div>
              ))}
              {pickups.length > 4 && (
                <div className="text-gray-500 text-xs col-span-2 text-center">
                  +{pickups.length - 4} more locations
                </div>
              )}
            </div>
          </div>
        )}

        <Link
          to={"/signup"}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-2.5 rounded-lg transition-all duration-200 text-center block"
        >
          For Book, Signup Now
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon }) {
  return (
    <div className="bg-[#F9FAFB] border border-[#2563EB]/20 rounded-xl p-6 text-center hover:shadow-md transition-all duration-300">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-[#2563EB] mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
