/**
 * Helper phân quyền: admin, manager, waiter, kitchen (staff) vs user thường.
 */

/** Roles được vào layout quản lý (có sidebar) */
const STAFF_ROLES = ["admin", "manager", "waiter", "kitchen"];

/**
 * User có phải staff (admin / manager / waiter / kitchen) không.
 * @param {string} role
 * @returns {boolean}
 */
export function isStaffRole(role) {
  return !!role && STAFF_ROLES.includes(role);
}

/**
 * Lấy đường dẫn mặc định sau khi đăng nhập theo role.
 * - admin => /admin
 * - manager => /admin/my-branch
 * - waiter => /admin/tables (phục vụ)
 * - kitchen => /admin/kitchen (chỉ tab Bếp)
 */
export function getDefaultStaffPath(role) {
  if (role === "admin") return "/admin";
  if (role === "manager") return "/admin/my-branch";
  if (role === "waiter") return "/admin/tables";
  if (role === "kitchen") return "/admin/kitchen";
  return "/dashboard";
}

/**
 * Kiểm tra role có được phép truy cập route (theo meta.allowedRoles) không.
 * @param {string} role
 * @param {object} routeMeta - route.meta
 * @returns {boolean}
 */
export function canAccessRoute(role, routeMeta) {
  if (!routeMeta || !routeMeta.allowedRoles) return false;
  return routeMeta.allowedRoles.includes(role);
}

/**
 * Lấy role hiện tại từ localStorage.
 * @returns {string|null}
 */
export function getCurrentRole() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.role || null;
  } catch {
    return null;
  }
}

/**
 * Route nào yêu cầu staff (admin/manager/waiter/kitchen) – dùng trong guard.
 * Kiểm tra route.meta.allowedRoles có giao với STAFF_ROLES không.
 */
export function isStaffOnlyRoute(route) {
  const allowed = route?.meta?.allowedRoles;
  if (!allowed || !Array.isArray(allowed)) return false;
  return allowed.some((r) => STAFF_ROLES.includes(r));
}

export { STAFF_ROLES };
