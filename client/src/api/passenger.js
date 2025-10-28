// src/api/passenger.js
import { http } from "./http";

export async function createPassenger(payload) {
  const { data } = await http.post("/api/passengers", payload);
  return data;
}

// E.164 like +94771234567

export async function getPassengerByPhone(phone) {
  if (!phone) return null;
  let p = String(phone).trim();
  if (!p.startsWith("+")) p = "+" + p;
  const { data } = await http.get(
    `/api/passengers/by-phone/${encodeURIComponent(p)}`
  );
  return data?.passenger;
}

export async function updatePassengerByPhone(phone, payload) {
  if (!phone) throw new Error("Phone is required");
  let p = String(phone).trim();
  if (!p.startsWith("+")) p = "+" + p;
  const { data } = await http.patch(
    `/api/passengers/by-phone/${encodeURIComponent(p)}`,
    payload
  );
  return data?.passenger;
}

export async function getPassengerByEmail(email) {
  console.log("hi");
  console.log(email);
  const { data } = await http.get(
    `/api/passengers?email=${encodeURIComponent(email)}`
  );
  if (!data?.success)
    throw new Error(data?.message || "Failed to load passenger");
  return data.data;
}

/** UPDATE passenger by email */
export async function updatePassengerByEmail(payload) {
  // payload: { email, fname, lname, phone, gender }
  const { data } = await http.put("/api/passengers/by-email", payload);
  if (!data?.success) throw new Error(data?.message || "Update failed");
  return data.data;
}

export async function logout() {
  const { data } = await http.post(
    "/api/passengers/logout",
    {},
    { withCredentials: true }
  );
  return data;
}
