// backend/routes/companyRoutes.js
import express from "express";
import {
  createCompany,
  checkCompanyExists,
  listCompanies,
  getCompanyById,
  getCompanyIdByEmail,
  updateCompany,
  changeStatus,
  removeCompany,
  getCompanyProfile,
} from "../controllers/companyController.js";

import { getCompanyBuses } from "../controllers/busController.js";
import { getDashboardStats } from "../controllers/dashboardController.js";
import {
  getCompanyBookings,
  getCompanyCancelledBookings,
} from "../controllers/bookingController.js";

const router = express.Router();

// Create
router.post("/", createCompany);

// Checks / lists
router.get("/exists", checkCompanyExists);
router.get("/", listCompanies);

// Utility
router.get("/getId", getCompanyIdByEmail);

// "Me" endpoints
router.get("/me", getCompanyProfile);
router.get("/buses", getCompanyBuses);
router.get("/dashboard", getDashboardStats);

// Bookings
router.get("/bookings", getCompanyBookings); // active only
router.get("/cancelled-bookings", getCompanyCancelledBookings); // cancelled only

// Param routes (keep last)
router.get("/:id", getCompanyById);
router.put("/:id", updateCompany);
router.patch("/:id/status", changeStatus);
router.delete("/:id", removeCompany);

export default router;
