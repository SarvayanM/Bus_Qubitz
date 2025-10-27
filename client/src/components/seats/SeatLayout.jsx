import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SeatLayout({
  seatLayout,
  seatStatus,
  onToggle,
  onSetGender,
  onClearSeat,
  selectedSeatGenders,
}) {
  const [popover, setPopover] = useState({
    open: false,
    seat: null,
    x: 0,
    y: 0,
  });
  const ref = useRef(null);

  const openGender = (event, seat) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopover({
      open: true,
      seat,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const closeGender = () => setPopover({ open: false, seat: null, x: 0, y: 0 });

  const handleSeatClick = (num, e) => {
    const before = seatStatus(num);
    onToggle(num);
    if (before === "available") {
      openGender(e, num);
    } else {
      closeGender();
    }
  };

  const handleGenderSelect = (seat, gender) => {
    onSetGender(seat, gender);
    closeGender();
  };

  return (
    <div ref={ref} className="relative">
      {/* RIGHT-SIDE CENTER FRONT BADGE (aligned with right seats R1/R2, i.e., “seats 3 & 4 on right”) */}

      {/* Legend (placed below the card header and above the rows) */}
      <div className="mb-4">
        <Legend />
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {seatLayout.map((row) => (
          <SeatRow
            key={`row-${row.row}`}
            row={row}
            seatStatus={seatStatus}
            onSeatClick={handleSeatClick}
            selectedSeatGenders={selectedSeatGenders}
          />
        ))}
      </div>

      {/* Gender popover */}
      <AnimatePresence>
        {popover.open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{ duration: 0.14 }}
            className="fixed z-[60]"
            style={{
              left: popover.x,
              top: popover.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-2.5 py-1.5 flex gap-1.5">
              {["Male", "Female", "Other"].map((g) => (
                <motion.button
                  key={g}
                  onClick={() => handleGenderSelect(popover.seat, g)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md
                             border border-gray-300 hover:bg-blue-100
                             transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {g}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* SeatRow + SeatButton                            */
/* ─────────────────────────────────────────────── */
function SeatRow({ row, seatStatus, onSeatClick, selectedSeatGenders }) {
  /**
   * Layout:
   * [RowNo] [L1] [L2] [aisle] [M/empty] [aisle] [R1] [R2]
   * The “FRONT” badge sits to the right of R1/R2 area.
   */
  const gridCls =
    "grid h-12 sm:h-14 items-center " +
    "grid-cols-[1.25rem_2.4rem_2.4rem_0.45rem_2.4rem_0.45rem_2.4rem_2.4rem] " +
    "sm:grid-cols-[1.5rem_2.6rem_2.6rem_0.5rem_2.6rem_0.5rem_2.6rem_2.6rem] gap-x-1.5";

  // Standard 2x2 row
  if (!row.lastRow && !row.rightOnly) {
    return (
      <div className={gridCls}>
        <RowNo n={row.row} />
        {/* Left seats */}
        {row.left.map((n) => (
          <SeatCell
            key={`L-${n}`}
            n={n}
            seatStatus={seatStatus}
            onSeatClick={onSeatClick}
            selectedSeatGenders={selectedSeatGenders}
          />
        ))}
        <Aisle />
        <MiddlePlaceholder />
        <Aisle />
        {/* Right seats */}
        {row.right.map((n) => (
          <SeatCell
            key={`R-${n}`}
            n={n}
            seatStatus={seatStatus}
            onSeatClick={onSeatClick}
            selectedSeatGenders={selectedSeatGenders}
          />
        ))}
      </div>
    );
  }

  // Special right-only row (e.g., 51-seat layout tail)
  if (row.rightOnly) {
    const [r1, r2] = row.right || [];
    return (
      <div className={gridCls}>
        <RowNo n={row.row} />
        <EmptyCell />
        <EmptyCell />
        <Aisle />
        <MiddlePlaceholder />
        <Aisle />
        <SeatCell
          n={r1}
          seatStatus={seatStatus}
          onSeatClick={onSeatClick}
          selectedSeatGenders={selectedSeatGenders}
        />
        <SeatCell
          n={r2}
          seatStatus={seatStatus}
          onSeatClick={onSeatClick}
          selectedSeatGenders={selectedSeatGenders}
        />
      </div>
    );
  }

  // Last row: 5 seats L1, L2, M, R1, R2
  const [s1, s2, s3, s4, s5] = row.lastSeats;
  return (
    <div className={gridCls}>
      <RowNo n={row.row} />
      <SeatCell
        n={s1}
        seatStatus={seatStatus}
        onSeatClick={onSeatClick}
        selectedSeatGenders={selectedSeatGenders}
      />
      <SeatCell
        n={s2}
        seatStatus={seatStatus}
        onSeatClick={onSeatClick}
        selectedSeatGenders={selectedSeatGenders}
      />
      <Aisle />
      <SeatCell
        n={s3}
        seatStatus={seatStatus}
        onSeatClick={onSeatClick}
        selectedSeatGenders={selectedSeatGenders}
      />
      <Aisle />
      <SeatCell
        n={s4}
        seatStatus={seatStatus}
        onSeatClick={onSeatClick}
        selectedSeatGenders={selectedSeatGenders}
      />
      <SeatCell
        n={s5}
        seatStatus={seatStatus}
        onSeatClick={onSeatClick}
        selectedSeatGenders={selectedSeatGenders}
      />
    </div>
  );
}

/* Small helpers for clean grid cells */
function RowNo({ n }) {
  return (
    <div className="text-[11px] text-gray-600 text-right pr-0.5 select-none flex items-center justify-end h-full">
      {n}
    </div>
  );
}
function Aisle() {
  return <div className="opacity-0 select-none" />;
}
function MiddlePlaceholder() {
  return <div className="opacity-0 select-none" />;
}
function EmptyCell() {
  return <div className="w-[2.4rem] h-[2.4rem] sm:w-[2.6rem] sm:h-[2.6rem]" />;
}

/* Seat cell wrapper + button */
function SeatCell({ n, seatStatus, onSeatClick, selectedSeatGenders }) {
  const status = seatStatus(n);
  const gender = selectedSeatGenders.get(n);

  const isDisabled =
    status === "bookedMale" ||
    status === "bookedFemale" ||
    status === "bookedOther" ||
    status === "unavailable";

  return (
    <div className="relative w-[2.4rem] h-[2.4rem] sm:w-[2.6rem] sm:h-[2.6rem]">
      {gender && (
        <motion.span
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: -8, opacity: 1 }}
          transition={{ duration: 0.15 }}
          className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1 rounded-full ${
            gender === "Male"
              ? "bg-blue-600 text-white"
              : gender === "Female"
              ? "bg-pink-600 text-white"
              : "bg-purple-600 text-white"
          }`}
        >
          {gender[0]}
        </motion.span>
      )}
      <SeatButton
        n={n}
        status={status}
        onClick={(e) => onSeatClick(n, e)}
        disabled={isDisabled}
      />
    </div>
  );
}

function SeatButton({ n, status, onClick, disabled }) {
  // Base look
  const base =
    "w-full h-full rounded-[6px] font-semibold text-[12px] sm:text-[13px] " +
    "transition flex items-center justify-center border " +
    "focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-300";

  // Colors & cursor
  const color =
    {
      available:
        "bg-white text-gray-900 border-blue-600 hover:bg-blue-600 hover:text-white cursor-pointer",
      selected: "bg-emerald-600 text-white border-emerald-600 cursor-pointer",
      bookedMale: "bg-blue-900 text-white border-blue-900 cursor-not-allowed",
      bookedFemale: "bg-pink-800 text-white border-pink-800 cursor-not-allowed",
      bookedOther:
        "bg-purple-800 text-white border-purple-800 cursor-not-allowed",
      unavailable: "bg-gray-600 text-white border-gray-600 cursor-not-allowed",
    }[status] ||
    "bg-white text-gray-900 border-blue-600 hover:bg-blue-600 hover:text-white cursor-pointer";

  // Animate only when clickable
  const hoverAnim = disabled
    ? {}
    : { scale: 1.04, y: -1, boxShadow: "0 4px 10px rgba(0,0,0,0.10)" };
  const tapAnim = disabled ? {} : { scale: 0.98, y: 0 };

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileHover={hoverAnim}
      whileTap={tapAnim}
      transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.7 }}
      className={`${base} ${color}`}
      aria-label={`Seat ${n}`}
      title={`Seat ${n}`}
    >
      {n}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────── */
/* Legend                                          */
/* ─────────────────────────────────────────────── */
function Legend() {
  const item = (cls, label, detail) => (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-4 h-4 rounded border ${cls}`}
        aria-hidden
      />
      <div className="text-xs">
        <div className="font-semibold text-gray-800">{label}</div>
        <div className="text-gray-600">{detail}</div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
      {item("bg-white border-blue-600", "Available")}
      {item("bg-emerald-600 border-emerald-600", "Selected")}
      {item("bg-blue-900 border-blue-900", "Booked (Male)")}
      {item("bg-pink-800 border-pink-800", "Booked (Female)")}
      {item("bg-purple-800 border-purple-800", "Booked (Other)")}
      {item("bg-gray-600 border-gray-600", "Unavailable")}
    </div>
  );
}
