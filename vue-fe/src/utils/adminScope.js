export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export function isSuperAdminUser(user = getCurrentUser()) {
  return user?.role === "admin" && user?.username === "admin";
}

export function getDefaultBranchIdForUser(user = getCurrentUser()) {
  const b = Number(user?.branch_id || 1);
  return Number.isFinite(b) && b > 0 ? b : 1;
}
