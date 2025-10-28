// src/components/BusLoader.jsx
import React from "react";
import { motion, useAnimationControls } from "framer-motion";

/**
 * BusLoader — Reusable animated "bus on a road" loading component
 *
 * Props:
 *  - message?: string
 *  - subtext?: string
 *  - height?: string (Tailwind h-* class, default: 'h-72')
 *  - className?: string (extra classes for the outer wrapper)
 */
export default function BusLoader({
  message = "Loading…",
  subtext = "Please wait a moment",
  height = "h-72",
  className = "",
}) {
  const roadControls = useAnimationControls();
  const cloudsControls = useAnimationControls();
  const hillsControls = useAnimationControls();

  React.useEffect(() => {
    roadControls.start({
      backgroundPositionX: ["0px", "800px"],
      transition: { duration: 1.2, ease: "linear", repeat: Infinity },
    });
    cloudsControls.start({
      x: [0, -80],
      transition: {
        duration: 12,
        ease: "linear",
        repeat: Infinity,
        repeatType: "reverse",
      },
    });
    hillsControls.start({
      x: [0, -40],
      transition: {
        duration: 8,
        ease: "linear",
        repeat: Infinity,
        repeatType: "reverse",
      },
    });
  }, [roadControls, cloudsControls, hillsControls]);

  const BusSVG = (
    <svg
      viewBox="0 0 220 100"
      className="w-52 md:w-60 drop-shadow-[0_8px_24px_rgba(14,165,233,0.35)]"
    >
      {/* Body */}
      <rect
        x="10"
        y="22"
        rx="10"
        ry="10"
        width="190"
        height="50"
        fill="#0EA5E9"
        opacity="0.08"
      />
      <rect
        x="10"
        y="20"
        rx="12"
        ry="12"
        width="190"
        height="56"
        fill="#3B82F6"
      />
      {/* Windows */}
      <rect x="24" y="30" width="32" height="20" rx="4" fill="#E2E8F0" />
      <rect x="62" y="30" width="32" height="20" rx="4" fill="#E2E8F0" />
      <rect x="100" y="30" width="32" height="20" rx="4" fill="#E2E8F0" />
      <rect x="138" y="30" width="48" height="20" rx="4" fill="#E2E8F0" />
      {/* Door line */}
      <rect x="136" y="28" width="2" height="26" fill="#1E3A8A" opacity="0.2" />
      {/* Headlight */}
      <circle cx="196" cy="48" r="6" fill="#FDE68A" />
      {/* Wheels */}
      <g>
        <circle cx="60" cy="76" r="14" fill="#0F172A" />
        <circle cx="60" cy="76" r="6" fill="#94A3B8" />
      </g>
      <g>
        <circle cx="160" cy="76" r="14" fill="#0F172A" />
        <circle cx="160" cy="76" r="6" fill="#94A3B8" />
      </g>
      {/* Stripe */}
      <rect x="10" y="48" width="190" height="6" fill="#1D4ED8" />
    </svg>
  );

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border border-slate-300/70",
        "bg-white px-5 sm:px-8",
        height,
        className,
      ].join(" ")}
    >
      {/* SKY + clouds */}
      <motion.div
        animate={cloudsControls}
        className="absolute top-6 left-0 right-0 flex justify-between px-6 pointer-events-none"
      >
        <Cloud className="w-24 opacity-40" />
        <Cloud className="w-28 opacity-30" />
        <Cloud className="w-20 opacity-40 hidden sm:block" />
      </motion.div>

      {/* HILLS */}
      <motion.div
        animate={hillsControls}
        className="absolute bottom-20 left-0 right-0 flex justify-between px-10 pointer-events-none"
      >
        <Hill className="w-48 opacity-30" />
        <Hill className="w-64 opacity-25" />
      </motion.div>

      {/* ROAD */}
      <div className="absolute bottom-0 left-0 right-0 h-24">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-200 to-slate-300 border-t border-slate-400/70" />
        <motion.div
          animate={roadControls}
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,255,.8) 0 40px, transparent 40px 80px)",
            backgroundSize: "80px 2px",
          }}
        />
      </div>

      {/* CONTENT (text above bus) */}
      <div className="absolute top-8 w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-2xl md:text-3xl font-bold text-blue-900">
            {message}
          </p>
          <p className="text-lg md:text-xl text-blue-700 mt-1">{subtext}</p>
        </motion.div>
      </div>

      {/* BUS */}
      <motion.div
        // animate using the `left` CSS property so the motion is relative to the loader div
        initial={{ left: "-100%" }}
        animate={{ left: ["-100%", "100%"] }}
        transition={{ duration: 4.2, ease: "linear", repeat: Infinity }}
        className="absolute bottom-16 left-0"
        style={{ position: "absolute" }}
      >
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
        >
          {BusSVG}
        </motion.div>
      </motion.div>
    </div>
  );
}

/* --- Small visual primitives ------------------------------------------- */

function Cloud({ className = "" }) {
  return (
    <svg viewBox="0 0 120 60" className={className}>
      <g fill="white">
        <ellipse cx="30" cy="36" rx="22" ry="12" />
        <ellipse cx="54" cy="30" rx="18" ry="14" />
        <ellipse cx="80" cy="36" rx="22" ry="12" />
      </g>
    </svg>
  );
}

function Hill({ className = "" }) {
  return (
    <svg viewBox="0 0 140 60" className={className}>
      <defs>
        <linearGradient id="hillGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M0,50 C30,10 60,10 90,50 C105,35 125,30 140,50 L140,60 L0,60 Z"
        fill="url(#hillGrad)"
      />
    </svg>
  );
}
