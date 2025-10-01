// src/api/passenger.js
import { http } from "./http";

export async function createPassenger(payload) {
  const { data } = await http.post("/api/passengers", payload);
  return data;
}

export async function getPassengerByEmail(email) {
  console.log("hi")
   console.log(email)
  const { data } = await http.get(
    `/api/passengers?email=${encodeURIComponent(email)}`
  );
  if (!data?.success)
    throw new Error(data?.message || "Failed to load passenger");
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
