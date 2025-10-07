// routes/whatsappRoutes.js
import { Router } from "express";
import WhatsAppController from "../controllers/whatsappController.js";

const router = Router();

// POST /api/whatsapp/sendWhatsApp
router.post("/sendWhatsApp", WhatsAppController.sendMessage);

export default router;
