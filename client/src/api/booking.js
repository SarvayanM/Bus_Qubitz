// src/api/booking.js
import { http } from "./http"; // your axios instance

export async function createBooking(payload) {
  const { data } = await http.post("/api/bookings", payload);
  if (!data?.success)
    throw new Error(data?.message || "Failed to create booking");
  return data.data;
}

export async function getBookingsByBusAndDate(busId, travelDate) {
  const { data } = await http.get(`/api/bookings/${busId}/${travelDate}`);
  if (!data?.success)
    throw new Error(data?.message || "Failed to load bookings");
  return data.data;
}

export async function getBookingListByBusAndDate(busId, travelDate) {
  const { data } = await http.get(`/api/bookings/list/${busId}/${travelDate}`);
  if (!data?.success)
    throw new Error(data?.message || "Failed to load bookings");
  return data.data;
}

// api/bookings.js
// api/booking.js (or wherever your http instance is used)
export async function getPassengerBookingHistory(email) {
  const url = email
    ? `/api/bookings/history?email=${encodeURIComponent(email)}`
    : `/api/bookings/history`;

  const { data } = await http.get(url, {
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  if (!data?.ok && !data?.success) {
    throw new Error(data?.message || "Failed to load bookings");
  }

  // IMPORTANT: return the full response object so the page can use .bookings, .email, .count
  return data;
}
