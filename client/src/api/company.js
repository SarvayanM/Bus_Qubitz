// Assumes you have an axios instance exported as `http` with baseURL and withCredentials
import { http } from "./http";
import { getCompanyIdFromCookie } from "../utils/cookies";
// -------- CRUD & Auth --------
export async function createCompany(payload) {
  const { data } = await http.post("/api/companies", payload);
  if (!data?.success) throw new Error(data?.message || "Create failed");
  return data.data;
}

export async function getCompanies({
  page = 1,
  limit = 10,
  q = "",
  status = "",
} = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", limit);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const { data } = await http.get(`/api/companies?${params.toString()}`);
  if (!data?.success) throw new Error(data?.message || "Fetch failed");
  return data;
}

export async function checkCompanyExists(companyName) {
  const { data } = await http.get(
    `/api/companies/exists?companyName=${encodeURIComponent(companyName)}`
  );
  if (!data?.success) throw new Error(data?.message || "Check failed");
  return data.exists; // true or false
}

export async function getCompanyById(id) {
  const { data } = await http.get(`/api/companies/${id}`);
  if (!data?.success) throw new Error(data?.message || "Fetch failed");
  return data.data;
}

export async function getCompanyIdByEmail(email) {
  console.log(email);
  const { data } = await http.get(
    `/api/companies/getId?email=${encodeURIComponent(email)}`
  );
  console.log(data);
  if (!data?.success) throw new Error(data?.message || "Fetch failed");
  return data.data;
}

/* export async function updateCompany(id, payload) {
  const { data } = await http.put(`/api/companies/${id}`, payload);
  if (!data?.success) throw new Error(data?.message || "Update failed");
  return data.data;
}

export async function changeCompanyStatus(id, status) {
  const { data } = await http.patch(`/api/companies/${id}/status`, { status });
  if (!data?.success) throw new Error(data?.message || "Status change failed");
  return data.data;
}

export async function removeCompany(id) {
  const { data } = await http.delete(`/api/companies/${id}`);
  if (!data?.success) throw new Error(data?.message || "Delete failed");
  return true;
} */

// Helper to always send companyId
function withCompanyIdParams(extra = {}) {
  const companyId = getCompanyIdFromCookie();
  if (!companyId) {
    throw new Error("Company ID cookie missing. Please log in again.");
  }
  return { params: { companyId, ...extra } };
}

export const fetchCompanyProfile = async () => {
  const res = await http.get("/api/companies/me", withCompanyIdParams());
  return res.data;
};

export const fetchCompanyBuses = async () => {
  const res = await http.get("/api/companies/buses", withCompanyIdParams());
  return res.data;
};

export const fetchDashboardStats = async (filters = {}) => {
  const res = await http.get(
    "/api/companies/dashboard",
    withCompanyIdParams(filters)
  );
  return res.data;
};

export const fetchCompanyBookings = async () => {
  const res = await http.get("/api/companies/bookings", withCompanyIdParams());
  return res.data;
};

export const fetchCompanyCancelledBookings = async () => {
  const res = await http.get(
    "/api/companies/cancelled-bookings",
    withCompanyIdParams()
  );
  return res.data;
};
