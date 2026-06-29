import { getDefaultStaffPath, canAccessRoute, isStaffRole } from "@/utils/auth.js";

export function registerNavigationGuards(router) {
  router.beforeEach((to, from, next) => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = user?.role || null;
    const isStaff = isStaffRole(role);

    if (to.meta.allowedRoles) {
      if (!token) {
        next("/login");
        return;
      }
      if (!canAccessRoute(role, to.meta)) {
        next(getDefaultStaffPath(role) || "/admin");
        return;
      }
      next();
      return;
    }

    if (to.path === "/dashboard" && isStaff) {
      next(getDefaultStaffPath(role));
      return;
    }
    if (to.path === "/my-table" && isStaff) {
      next(getDefaultStaffPath(role));
      return;
    }

    next();
  });
}
