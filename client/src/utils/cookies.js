// src/utils/cookies.js
export function getCompanyIdFromCookie() {
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("companyId="));

  if (!match) return null;
  return decodeURIComponent(match.split("=")[1]);
}
