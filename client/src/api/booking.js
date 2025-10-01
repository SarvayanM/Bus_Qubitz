// src/api/booking.js
import {http} from "./http"; // your axios instance

export async function createBooking(payload) {
  const { data } = await http.post("/api/bookings", payload);
  if (!data?.success) throw new Error(data?.message || "Failed to create booking");
  return data.data;
}
