import Company from "../models/Company.js";

/** Build query from filters */
const buildQuery = (q = "", status) => {
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (status) filter.status = status;
  return filter;
};

/** Return safe fields (no passwordHash) */
const toSafe = (doc) => {
  const {
    _id,
    companyName,
    email,
    phone,
    address,
    website,
    registrationNumber,
    contactPerson,
    status,
    createdAt,
    updatedAt,
  } = doc;
  return {
    _id,
    companyName,
    email,
    phone,
    address,
    website,
    registrationNumber,
    contactPerson,
    status,
    createdAt,
    updatedAt,
  };
};

export const createCompany = async (req, res) => {
  try {
    const {
      companyName,
      email,
      phone,
      address,
      website,
      registrationNumber,
      contactPerson,
      status,
    } = req.body;

    if (!companyName || !email || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    const exists = await Company.findOne({ email });
    if (exists)
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });

    const company = await Company.create({
      companyName,
      email,
      phone,
      address,
      website,
      registrationNumber,
      contactPerson,
      status,
    });

    return res.status(201).json({ success: true, data: toSafe(company) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const checkCompanyExists = async (req, res) => {
  try {
    const { companyName } = req.query;
    if (!companyName) {
      return res
        .status(400)
        .json({ success: false, message: "companyName is required" });
    }

    const exists = await Company.exists({
      companyName: { $regex: `^${companyName}$`, $options: "i" }, // case-insensitive exact match
    });

    res.json({ success: true, exists: !!exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 10, q = "", status } = req.query;
    const filter = buildQuery(q, status);
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Company.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Company.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items.map(toSafe),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: toSafe(company) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getCompanyIdByEmail = async (req, res) => {
  console.log("Incoming query:", req.query);
  try {
    const { email } = req.query;
    console.log(req.query.email);
    const emailo = "wijitha@gmail.com";
    console.log(email);
    const company = await Company.findOne({ email: emailo }); // ✅ findOne instead of find

    if (!company)
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });

    res.json({ success: true, data: company._id }); // ✅ no need for "toSafe"
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const {
      companyName,
      phone,
      address,
      website,
      registrationNumber,
      contactPerson,
    } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      {
        companyName,
        phone,
        address,
        website,
        registrationNumber,
        contactPerson,
      },
      { new: true, runValidators: true }
    );
    if (!company)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: toSafe(company) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changeStatus = async (req, res) => {
  try {
    const { status } = req.body; // "pending" | "approved" | "suspended"
    if (!["pending", "approved", "suspended"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!company)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: toSafe(company) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeCompany = async (req, res) => {
  try {
    const deleted = await Company.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
