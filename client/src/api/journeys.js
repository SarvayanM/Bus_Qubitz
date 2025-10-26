import { http } from "./http";

/**
 * fetchJourneys({ from, to, date, page, limit })
 * Server-side pagination, returns { ok, items, total, page, limit, totalPages }
 */
export async function fetchJourneys(params = {}) {
  // Clone and remove empty or undefined values to avoid sending empty strings
  const cleaned = {};
  Object.keys(params || {}).forEach((k) => {
    const v = params[k];
    if (v !== undefined && v !== null) {
      const s = typeof v === "string" ? v.trim() : v;
      // Only include non-empty strings or numbers
      if (typeof s === "string") {
        if (s.length > 0) cleaned[k] = s;
      } else {
        cleaned[k] = s;
      }
    }
  });

  const { data } = await http.get("/api/journeys", { params: cleaned });
  return data;
}
