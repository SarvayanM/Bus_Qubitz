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
