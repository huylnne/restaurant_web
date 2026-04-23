function isSuperAdmin(req) {
  const role = req.userRole || req.user?.role;
  const username = req.user?.username;
  return role === "admin" && username === "admin";
}

function getUserBranchId(req) {
  const raw = req.user?.branch_id;
  const branchId = parseInt(raw, 10);
  return Number.isFinite(branchId) ? branchId : null;
}

function resolveBranchId(req, requestedBranchId, fallback = 1) {
  const userBranchId = getUserBranchId(req);
  const parsedRequested = parseInt(requestedBranchId, 10);
  const requested = Number.isFinite(parsedRequested) ? parsedRequested : null;

  if (isSuperAdmin(req)) {
    return requested || userBranchId || fallback;
  }
  return userBranchId || requested || fallback;
}

module.exports = {
  isSuperAdmin,
  getUserBranchId,
  resolveBranchId,
};
