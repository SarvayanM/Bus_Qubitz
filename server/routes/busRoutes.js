// routes/busRoutes.js
import { Router } from "express";
import { createBus, getBus, getBusById, getBusesByCompany, getAvailableDatesForBus } from "../controllers/busController.js";

const router = Router();

// Create a bus (matches your frontend POST /api/buses)
router.post("/", createBus);
router.get("/", getBus);
router.get("/:id", getBusById);
// Company-scoped list
router.get("/by-company/:companyId", getBusesByCompany);
// Upcoming/available dates (computed from bus schedule + frequency)
router.get("/:id/available-dates", getAvailableDatesForBus);


export default router;
