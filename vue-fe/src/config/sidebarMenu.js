/**
 * Cấu hình menu sidebar dùng chung cho admin / manager / waiter / kitchen.
 * Mỗi item: key, label, icon (tên component), route (null = không link), roles (mảng role được phép xem).
 * - admin: full menu
 * - manager: quản lý chi nhánh của mình
 * - waiter: chỉ Quản lý món ăn, Quản lý bàn / Phục vụ, Bếp
 * - kitchen: chỉ Bếp
 */
export const SIDEBAR_MENU = [
  {
    key: "dashboard",
    label: "Quản lý nhà hàng",
    icon: "KnifeFork",
    route: "/admin",
    roles: ["admin"],
  },
  {
    key: "reports",
    label: "Báo cáo & Thống kê",
    icon: "DataLine",
    route: "/admin/reports",
    roles: ["admin"],
  },
  {
    key: "employees",
    label: "Quản lý nhân viên",
    icon: "User",
    route: "/admin/employees",
    roles: ["admin"],
  },
  {
    key: "branches-admin",
    label: "Quản lý chi nhánh",
    icon: "OfficeBuilding",
    route: "/admin/branches",
    roles: ["admin"],
  },
  {
    key: "branch-manager",
    label: "Chi nhánh của tôi",
    icon: "OfficeBuilding",
    route: "/admin/my-branch",
    roles: ["manager"],
  },
  {
    key: "menu",
    label: "Quản lý món ăn",
    icon: "Dish",
    route: "/admin/menu",
    roles: ["admin", "waiter"],
  },
  {
    key: "tables",
    label: "Quản lý bàn / Phục vụ",
    icon: "Grid",
    route: "/admin/tables",
    roles: ["admin", "waiter"],
  },
  {
    key: "kitchen",
    label: "Bếp",
    icon: "Dish",
    route: "/admin/kitchen",
    roles: ["admin", "waiter", "kitchen"],
  },
  {
    key: "settings",
    label: "Cài đặt",
    icon: "Setting",
    route: null,
    roles: ["admin"],
  },
];

/**
 * Lọc menu theo role hiện tại.
 * @param {string} role - admin | waiter | kitchen | user
 * @returns {Array} Danh sách menu item được phép xem
 */
export function getMenuByRole(role) {
  if (!role) return [];
  return SIDEBAR_MENU.filter((item) => item.roles.includes(role));
}

/**
 * Kiểm tra role có được phép xem menu item không.
 */
export function canAccessMenu(role, menuItem) {
  if (!role || !menuItem || !menuItem.roles) return false;
  return menuItem.roles.includes(role);
}
