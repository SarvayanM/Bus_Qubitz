// src/api/passenger.js
import { http } from "./http";

export async function logout() {
  try {
    const { data } = await http.post(
      "api/passengers",
      {},
      { withCredentials: true }
    );
    return data;
  } catch (err) {
    throw err.response?.data || { success: false, message: "Logout failed" };
  }
}
