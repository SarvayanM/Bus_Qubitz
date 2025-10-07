// src/api/whatsappApi.js
import { http } from "./http";

export const sendWhatsAppMessage = async ({ to, message }) => {
  const { data } = await http.post("/api/whatsapp/sendWhatsApp", {
    to,
    message,
  });
  if (!data?.success) {
    throw new Error(data?.message || "Failed to send WhatsApp message");
  }
  return data; // { success: true, sid }
};
