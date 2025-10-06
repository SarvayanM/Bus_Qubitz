// routes/companyRoutes.js
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
} from "../controllers/companyController.js";

const router = express.Router();

// Create
router.post("/", createCompany);

// Checks / lists
router.get("/exists", checkCompanyExists);
router.get("/", listCompanies);

// ✅ Specific routes FIRST
router.get("/getId", getCompanyIdByEmail);

// ✅ Param route LAST (or constrain it)
router.get("/:id", getCompanyById);
router.put("/:id", updateCompany);
router.patch("/:id/status", changeStatus);
router.delete("/:id", removeCompany);

export default router;
