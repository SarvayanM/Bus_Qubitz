import { http } from "./http";

/**
 * fetchJourneys({ from, to, date, page, limit })
 * Server-side pagination, returns { ok, items, total, page, limit, totalPages }
 */
export async function fetchJourneys(params = {}) {
  const { data } = await http.get("/api/journeys", { params });
  return data;
}
