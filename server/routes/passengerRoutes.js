
// routes/busRoutes.js
import { Router } from "express";
import { logout } from "../controllers/passengerController.js";

const router = Router();

// Create a bus (matches your frontend POST /api/buses)
router.post("/", logout);


export default router;
