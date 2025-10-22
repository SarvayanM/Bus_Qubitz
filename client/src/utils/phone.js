// Simple helper to produce an E.164 number like +9471XXXXXXX
export const toE164 = (countryCode, local) => {
  if (!countryCode || !local) return null;
  // Strip spaces/dashes and leading zeros in the local part
  const cleaned = String(local).replace(/[^\d]/g, "");
  if (!cleaned) return null;

  // If user typed number already starting with country code (e.g. +9471…)
  if (local.trim().startsWith("+")) {
    const only = local.replace(/\s/g, "");
    // naive E164 sanity
    return /^\+\d{7,15}$/.test(only) ? only : null;
  }

  const merged = `${countryCode}${cleaned.replace(/^0+/, "")}`;
  return /^\+\d{7,15}$/.test(merged) ? merged : null;
};
