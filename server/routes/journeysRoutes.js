import { Router } from "express";
import { getJourneys } from "../controllers/journeysController.js";

const router = Router();

// GET /api/journeys?from=&to=&date=YYYY-MM-DD&page=1&limit=10
router.get("/", getJourneys);

export default router;
