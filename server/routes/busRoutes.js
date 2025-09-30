// routes/busRoutes.js
import { Router } from "express";
import { createBus, getBus, getBusById } from "../controllers/busController.js";

const router = Router();

// Create a bus (matches your frontend POST /api/buses)
router.post("/", createBus);
router.get("/", getBus);
router.get("/:id", getBusById);

export default router;
