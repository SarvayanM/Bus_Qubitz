// Parse "23:00", "12 AM", "00:00", "24:00"
export function parseHHMMFlexible(t) {
  if (!t) return { hh: 0, mm: 0, midnightNextDay: false };

  const raw = String(t).trim(); // keep raw for "24:00" check
  let s = raw.replace(/\./g, ":").replace(/\s+/g, " ").toUpperCase();

  // Only "24:00" means next day's midnight
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

  // AM/PM transform (00:00 is the start of the same day)
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

  const base = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0); // local
  if (midnightNextDay) {
    base.setDate(base.getDate() + 1);
    base.setHours(0, 0, 0, 0);
    return base;
  }
  base.setHours(hh, mm, 0, 0);
  return base;
}

export const msUntil = (date) => date.getTime() - Date.now();

export function fmtHMS(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}

export function refundPercent(hoursBefore) {
  if (hoursBefore >= 24) return 100;
  if (hoursBefore >= 12) return 75;
  if (hoursBefore >= 6) return 50;
  if (hoursBefore >= 4) return 0;
  return -1;
}
