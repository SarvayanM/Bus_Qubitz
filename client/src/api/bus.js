import { http } from "./http";

export async function createBus(payload) {
  const { data } = await http.post("/api/buses", payload);
  return data;
}

export async function getBuses() {
  const { data } = await http.get("/api/buses");
  if (!data?.success) throw new Error(data?.message || "Failed to load buses");
  return data.data; // array of bus docs
}

// Optional: filter by ?from=&to= for dashboard pre-filter
export async function getBusesList({ from, to } = {}) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await http.get("/api/buses/list", { params });
  return data;
}

export async function getBusById(id) {
  const { data } = await http.get(`/api/buses/${id}`);
  if (!data?.success) throw new Error(data?.message || "Failed to load bus");
  return data.data; // the Bus document
}

// GET /api/buses/by-company/:companyId
export async function getBusesByCompany(companyId) {
  const { data } = await http.get(
    `/api/buses/by-company/${encodeURIComponent(companyId)}`
  );
  if (!data?.success) throw new Error(data?.message || "Failed to load buses");
  return data.data; // array
}

export async function getAvailableDatesForBus(id, { from, days } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (days) params.set("days", String(days));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const { data } = await http.get(
    `/api/buses/${encodeURIComponent(id)}/available-dates${qs}`
  );
  if (!data?.success) throw new Error(data?.message || "Failed to load dates");
  return data.data; // array of "YYYY-MM-DD"
}

export async function updateBus(id, payload) {
  const { data } = await http.put(`/api/buses/${id}`, payload);
  if (!data?.success) throw new Error(data?.message || "Update failed");
  return data.data;
}

export async function deleteBus(id) {
  const { data } = await http.delete(`/api/buses/${id}`);
  if (!data?.success) throw new Error(data?.message || "Delete failed");
  return data.data;
}
