// backend/utils/cancelHelpers.js
export function toDepartureDate(travelDate, hhmm = "00:00") {
  const [y, m, d] = (travelDate || "").split("-").map(Number);
  const [hh, mm] = (hhmm || "00:00").split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export function refundPercent(hoursBefore) {
  if (hoursBefore >= 24) return 100;
  if (hoursBefore >= 12) return 75;
  if (hoursBefore >= 6) return 50;
  if (hoursBefore >= 4) return 0;
  return -1; // not cancellable
}
