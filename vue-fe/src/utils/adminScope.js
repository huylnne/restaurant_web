/**
 * ADMIN SCOPE HELPERS (FE) — đọc user đăng nhập và suy luận quyền super admin + chi nhánh mặc định.
 */

/** Lấy object user đã lưu khi đăng nhập; JSON hỏng/không có → trả object rỗng (không ném lỗi). */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

/** Super admin = tài khoản admin gốc (username "admin") — được xem/chọn mọi chi nhánh. */
export function isSuperAdminUser(user = getCurrentUser()) {
  return user?.role === "admin" && user?.username === "admin";
}

/** Chi nhánh mặc định của user: lấy branch_id của user, fallback về 1 nếu thiếu/không hợp lệ. */
export function getDefaultBranchIdForUser(user = getCurrentUser()) {
  const b = Number(user?.branch_id || 1);
  return Number.isFinite(b) && b > 0 ? b : 1;
}
