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

export async function getBusById(id) {
  const { data } = await http.get(`/api/buses/${id}`);
  if (!data?.success) throw new Error(data?.message || "Failed to load bus");
  return data.data; // the Bus document
}
