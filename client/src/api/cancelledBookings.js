// frontend/src/api/cancelledBookings.js
import { http } from "./http"; // your axios instance

export async function getCancelledBookingsByPhone(phone) {
  const { data } = await http.get(
    `/api/cancelled-bookings?phone=${encodeURIComponent(phone)}`
  );
  return data; // { count, items, passenger? }
}
