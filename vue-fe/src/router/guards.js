/**
 * NAVIGATION GUARDS (FE) — chạy TRƯỚC mỗi lần chuyển route để chặn/điều hướng theo đăng nhập & vai trò.
 */
import { getDefaultStaffPath, canAccessRoute, isStaffRole } from "@/utils/auth.js";

export function registerNavigationGuards(router) {
  router.beforeEach((to, from, next) => {
    // Đọc phiên đăng nhập hiện tại từ localStorage.
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = user?.role || null;
    const isStaff = isStaffRole(role);

    // Route có yêu cầu quyền (meta.allowedRoles) → phải đăng nhập và đúng vai trò.
    if (to.meta.allowedRoles) {
      if (!token) {
        next("/login"); // chưa đăng nhập → về trang login
        return;
      }
      if (!canAccessRoute(role, to.meta)) {
        // Đăng nhập nhưng sai quyền → đẩy về trang mặc định theo vai trò.
        next(getDefaultStaffPath(role) || "/admin");
        return;
      }
      next();
      return;
    }

    // Nhân viên không nên vào các trang dành cho KHÁCH (dashboard/my-table) → chuyển về khu quản trị.
    if (to.path === "/dashboard" && isStaff) {
      next(getDefaultStaffPath(role));
      return;
    }
    if (to.path === "/my-table" && isStaff) {
      next(getDefaultStaffPath(role));
      return;
    }

    next(); // các route public khác: cho đi bình thường
  });
}
