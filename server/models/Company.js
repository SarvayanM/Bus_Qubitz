import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: "" },

    website: { type: String, default: null },
    registrationNumber: { type: String, default: null },
    contactPerson: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Helpful indexes
CompanySchema.index({ email: 1 }, { unique: true });
CompanySchema.index({
  companyName: "text",
  contactPerson: "text",
  registrationNumber: "text",
});

const Company = mongoose.model("Company", CompanySchema);
export default Company;
