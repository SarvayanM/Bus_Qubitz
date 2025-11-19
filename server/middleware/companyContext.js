// backend/middleware/companyContext.js
import Company from "../models/Company.js";

export const requireCompanyContext = async (req, res, next) => {
  try {
    const cookieCompanyId = req.cookies?.companyId;
    const queryCompanyId = req.query?.companyId;
    const companyId = (cookieCompanyId || queryCompanyId || "").trim();
    console.log("companyId in requireCompanyContext:", companyId);
    if (!companyId) {
      return res
        .status(400)
        .json({ message: "Company ID not provided in cookie or query" });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found for this ID" });
    }

    req.company = company;
    req.companyId = company._id;
    next();
  } catch (err) {
    console.error("requireCompanyContext error:", err);
    res.status(500).json({ message: "Server error resolving company" });
  }
};
