// routes/passengerRoutes.js
import { Router } from "express";
import {
  createPassenger,
  getPassengerByEmail as getPassengerByEmailCtrl, // alias to avoid confusion
  logout,
} from "../controllers/passengerController.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    console.log("[GET] /api/passengers hit", req.query);

    const { email } = req.query;
    if (!email) {
      // Always return when email is missing
      return res
        .status(400)
        .json({ success: false, message: "Query param 'email' is required" });
    }

    // Delegate to controller; it must always send a response
    return getPassengerByEmailCtrl(req, res);
  } catch (err) {
    console.error("Error in /api/passengers:", err);
    return next(err);
  }
});

router.post("/", createPassenger);
router.post("/logout", logout);

export default router;
