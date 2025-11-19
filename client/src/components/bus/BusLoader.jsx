// src/components/BusLoader.jsx
import React from "react";
import { motion, useAnimationControls } from "framer-motion";

/**
 * BusLoader — Compact circular "bus on a road" loading component
 *
 * Props:
 *  - message?: string
 *  - subtext?: string
 *  - height?: string (Tailwind height class for the wrapper, default: 'h-72')
 *  - className?: string (extra classes for the outer wrapper)
 *
 * Note:
 *  - The loader is centered vertically & horizontally inside its wrapper.
 *  - Use height="h-screen" if you want a full-page centered loader.
 */
export default function BusLoader({
  message = "Loading your buses…",
  subtext = "Please wait a moment",
  height = "h-72",
  className = "",
}) {
  const roadControls = useAnimationControls();
  const cloudsControls = useAnimationControls();

  React.useEffect(() => {
    // Animate dashed road
    roadControls.start({
      backgroundPositionX: ["0px", "120px"],
      transition: { duration: 1.1, ease: "linear", repeat: Infinity },
    });

    // Gentle cloud drift
    cloudsControls.start({
      x: [0, 10, -10, 0],
      transition: {
        duration: 10,
        ease: "linear",
        repeat: Infinity,
      },
    });
  }, [roadControls, cloudsControls]);

  const BusSVG = (
    <svg
      viewBox="0 0 220 100"
      className="w-24 sm:w-28 md:w-32 drop-shadow-[0_8px_18px_rgba(30,64,175,0.45)]"
    >
      {/* Shadow under bus */}
      <ellipse
        cx="110"
        cy="84"
        rx="70"
        ry="8"
        fill="rgba(15,23,42,0.25)"
        opacity="0.35"
      />

      {/* Body base (soft highlight) */}
      <rect
        x="10"
        y="22"
        rx="10"
        ry="10"
        width="190"
        height="50"
        fill="#1E3A8A"
        opacity="0.08"
      />

      {/* Main body */}
      <rect
        x="10"
        y="20"
        rx="12"
        ry="12"
        width="190"
        height="56"
        fill="#1E3A8A" // blue-900
      />

      {/* Top accent strip */}
      <rect x="10" y="20" width="190" height="8" fill="#1D4ED8" />

      {/* Windows */}
      <rect x="24" y="30" width="32" height="20" rx="4" fill="#E5F0FF" />
      <rect x="62" y="30" width="32" height="20" rx="4" fill="#E5F0FF" />
      <rect x="100" y="30" width="32" height="20" rx="4" fill="#E5F0FF" />
      <rect x="138" y="30" width="48" height="20" rx="4" fill="#E5F0FF" />

      {/* Door line */}
      <rect x="136" y="28" width="2" height="26" fill="#0F172A" opacity="0.2" />

      {/* Headlight */}
      <circle cx="196" cy="48" r="6" fill="#FDE68A" />
      <circle cx="196" cy="48" r="3" fill="#FEF3C7" />

      {/* Wheels */}
      <g>
        <circle cx="60" cy="76" r="13" fill="#020617" />
        <circle cx="60" cy="76" r="7" fill="#CBD5F5" />
      </g>
      <g>
        <circle cx="160" cy="76" r="13" fill="#020617" />
        <circle cx="160" cy="76" r="7" fill="#CBD5F5" />
      </g>

      {/* Side stripe */}
      <rect x="10" y="48" width="190" height="6" fill="#1D4ED8" />
    </svg>
  );

  return (
    <div
      className={[
        "flex flex-col items-center justify-center",
        "text-center",
        height,
        className,
      ].join(" ")}
    >
      {/* Circular loader */}
      <div className="relative">
        {/* Soft glow ring */}
        <div className="absolute inset-0 -inset-2 sm:-inset-2 rounded-full blur-xl bg-blue-900/15 pointer-events-none" />

        {/* Outer ring */}
        <div className="relative flex items-center justify-center">
          <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.18)] overflow-hidden">
            {/* Sky backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-slate-50 to-slate-100" />

            {/* Clouds */}
            <motion.div
              animate={cloudsControls}
              className="absolute top-3 left-0 right-0 flex justify-between px-3 sm:px-4 pointer-events-none"
            >
              <Cloud className="w-10 opacity-70" />
              <Cloud className="w-12 opacity-50" />
            </motion.div>

            {/* Subtle sun / glow in top-left */}
            <div className="absolute -left-4 -top-4 w-10 h-10 rounded-full bg-blue-200/40 blur-lg" />

            {/* Road */}
            <div className="absolute bottom-7 left-4 right-4 h-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-200 to-slate-300 border border-slate-300/70" />
              <motion.div
                animate={roadControls}
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,0.95) 0 26px, transparent 26px 52px)",
                  backgroundSize: "52px 2px",
                }}
              />
            </div>

            {/* Bus */}
            <motion.div
              initial={{ x: "-45%" }}
              animate={{ x: ["-45%", "45%"] }}
              transition={{
                duration: 3.2,
                ease: "linear",
                repeat: Infinity,
              }}
              className="absolute bottom-7 left-1/2 -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{
                  duration: 0.9,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              >
                {BusSVG}
              </motion.div>
            </motion.div>
          </div>

          {/* Thin blue focus ring */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-blue-900/20" />
        </div>
      </div>

      {/* Text below loader */}
      {(message || subtext) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mt-4 px-4 max-w-sm"
        >
          {message && (
            <p className="text-base sm:text-lg md:text-xl font-semibold text-blue-900">
              {message}
            </p>
          )}
          {subtext && (
            <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">
              {subtext}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* --- Small visual primitives ------------------------------------------- */

function Cloud({ className = "" }) {
  return (
    <svg viewBox="0 0 120 60" className={className}>
      <g fill="white">
        <ellipse cx="30" cy="34" rx="20" ry="10" />
        <ellipse cx="56" cy="30" rx="18" ry="12" />
        <ellipse cx="82" cy="34" rx="20" ry="10" />
      </g>
    </svg>
  );
}
