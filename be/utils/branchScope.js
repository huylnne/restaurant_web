/**
 * UTIL BRANCH SCOPE — xác định chi nhánh user được thao tác trong Admin.
 * Ctrl+F: branch scope, resolveBranchId, isSuperAdmin, branch_id
 * Luồng demo: admin xem toàn chuỗi, waiter/kitchen/manager thao tác theo chi nhánh.
 */
function isSuperAdmin(req) {
  // Lấy role từ req (được middleware auth gắn) — chấp nhận cả 2 vị trí lưu.
  const role = req.userRole || req.user?.role;
  const username = req.user?.username;
  // "Super admin" = vừa có role admin, vừa đúng tài khoản username "admin"
  // (chỉ tài khoản này mới được xem/chọn mọi chi nhánh).
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
  // Chi nhánh gắn với tài khoản đang đăng nhập.
  const userBranchId = getUserBranchId(req);
  // Chi nhánh mà client YÊU CẦU (vd query ?branch_id=) — parse an toàn về số hoặc null.
  const parsedRequested = parseInt(requestedBranchId, 10);
  const requested = Number.isFinite(parsedRequested) ? parsedRequested : null;

  if (isSuperAdmin(req)) {
    // Super admin: được chọn chi nhánh theo yêu cầu; không có thì dùng của mình; cuối cùng fallback.
    return requested || userBranchId || fallback;
  }
  // Nhân viên/manager: LUÔN khóa vào chi nhánh của mình trước (không cho vượt sang chi nhánh khác).
  return userBranchId || requested || fallback;
}

module.exports = {
  isSuperAdmin,
  getUserBranchId,
  resolveBranchId,
};
