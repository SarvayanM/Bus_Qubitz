// controllers/whatsappController.js
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const rawFrom = process.env.TWILIO_WHATSAPP_NUMBER; // e.g. "whatsapp:+14155238886"
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken || !rawFrom) {
  console.warn(
    "[WhatsApp] Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_NUMBER envs"
  );
}

const client = twilio(accountSid, authToken);

// ensure something like "whatsapp:+1415..." (and not "++")
function toWhatsAppAddr(input) {
  let s = String(input || "").trim();
  if (!s) throw new Error("Recipient phone is required");

  // strip whitespace
  s = s.replace(/\s+/g, "");

  // if already has whatsapp: prefix, trust it
  if (s.toLowerCase().startsWith("whatsapp:")) return s;

  // ensure leading +
  if (!s.startsWith("+")) s = `+${s}`;

  return `whatsapp:${s}`;
}

function normalizeFrom(fromEnv) {
  let f = String(fromEnv || "").trim();
  if (!f) throw new Error("TWILIO_WHATSAPP_NUMBER is not configured");
  // accept "+1415..." or "whatsapp:+1415..."
  if (f.toLowerCase().startsWith("whatsapp:")) return f;
  if (!f.startsWith("+")) f = `+${f}`;
  return `whatsapp:${f}`;
}

class WhatsAppController {
  static async sendMessage(req, res) {
    try {
      const { to, message } = req.body || {};
      if (!message) {
        return res
          .status(400)
          .json({ success: false, message: "Missing 'message' body" });
      }

      const toAddr = toWhatsAppAddr(to); // e.g. "whatsapp:+9477…"
      const fromAddr = normalizeFrom(rawFrom); // e.g. "whatsapp:+14155238886"

      const sent = await client.messages.create({
        from: fromAddr,
        to: toAddr,
        body: message,
      });

      return res.json({ success: true, sid: sent.sid });
    } catch (err) {
      console.error("[WhatsApp] send error:", err);
      const msg = err?.message || "Failed to send WhatsApp message";
      return res.status(500).json({ success: false, message: msg });
    }
  }
}

export default WhatsAppController;
