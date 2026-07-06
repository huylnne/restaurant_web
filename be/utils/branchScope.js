/**
 * UTIL BRANCH SCOPE — xác định chi nhánh user được thao tác trong Admin.
 * Ctrl+F: branch scope, resolveBranchId, isSuperAdmin, branch_id
 * Luồng demo: admin xem toàn chuỗi, waiter/kitchen/manager thao tác theo chi nhánh.
 */
function isSuperAdmin(req) {
  const role = req.userRole || req.user?.role;
  const username = req.user?.username;
  return role === "admin" && username === "admin";
}

/** [PHÂN QUYỀN CHI NHÁNH] Lấy branch_id gắn với nhân viên từ JWT/req.user. Ctrl+F: getUserBranchId */
function getUserBranchId(req) {
  const raw = req.user?.branch_id;
  const branchId = parseInt(raw, 10);
  return Number.isFinite(branchId) ? branchId : null;
}

/**
 * [PHÂN QUYỀN CHI NHÁNH] Admin username=admin được chọn branch; nhân viên ưu tiên branch_id của mình.
 * Ctrl+F: resolveBranchId, chọn chi nhánh
 */
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
