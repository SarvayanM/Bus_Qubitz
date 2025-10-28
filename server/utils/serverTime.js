export function parseHHMMFlexible(t) {
  if (!t) return { hh: 0, mm: 0, midnightNextDay: false };

  const raw = String(t).trim();
  let s = raw.replace(/\./g, ":").replace(/\s+/g, " ").toUpperCase();

  if (s === "24:00") return { hh: 0, mm: 0, midnightNextDay: true };

  const ampm = /AM|PM/.test(s) ? (s.includes("AM") ? "AM" : "PM") : null;
  s = s.replace(/\s?(AM|PM)/, "");

  let hh = 0,
    mm = 0;
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [hStr, mStr] = s.split(":");
    hh = Math.max(0, Math.min(23, parseInt(hStr, 10) || 0));
    mm = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  } else if (/^\d{1,2}$/.test(s)) {
    hh = Math.max(0, Math.min(23, parseInt(s, 10) || 0));
    mm = 0;
  }

  if (ampm) {
    if (ampm === "AM") {
      if (hh === 12) hh = 0;
    } else {
      if (hh !== 12) hh += 12;
    }
  }

  // IMPORTANT CHANGE: Do NOT bump plain "00:00"/"12:00 AM"
  const midnightNextDay = false;
  return { hh, mm, midnightNextDay };
}

export function toDepartureDate(travelDate, timeHHMM) {
  const [y, m, d] = String(travelDate).split("-").map(Number);
  const { hh, mm, midnightNextDay } = parseHHMMFlexible(timeHHMM || "00:00");
  const base = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  if (midnightNextDay) {
    base.setDate(base.getDate() + 1);
    base.setHours(0, 0, 0, 0);
    return base;
  }
  base.setHours(hh, mm, 0, 0);
  return base;
}

export function refundPercent(hoursBefore) {
  if (hoursBefore >= 24) return 100;
  if (hoursBefore >= 12) return 75;
  if (hoursBefore >= 6) return 50;
  if (hoursBefore >= 4) return 0;
  return -1;
}

export function parseMoneyToNumber(x) {
  // Accept numbers or strings like "1,200", "LKR 1,200.50", "1200.00"
  if (typeof x === "number") return isFinite(x) ? x : NaN;
  if (typeof x !== "string") return NaN;
  const cleaned = x.replace(/[^\d.]/g, ""); // strip everything except digits and dot
  // handle "1.200.50" corner cases by keeping the first dot only
  const parts = cleaned.split(".");
  const normalized =
    parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  const n = Number(normalized);
  return isFinite(n) ? n : NaN;
}

export function safeSeatsCount(seats) {
  if (!Array.isArray(seats)) return 1;
  // seats are objects: { number, gender }. Allow 0 as a valid length but guard against nonsense.
  return seats.length || 1;
}
