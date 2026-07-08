/**
 * ADMIN ROUTES — các trang khu quản trị (/admin/...). Mỗi route gắn meta.allowedRoles
 * để guard chặn theo vai trò (admin/manager/waiter/kitchen).
 */
import AdminDashboard from "@/views/admin/AdminDashboard.vue";
import AdminKitchen from "@/views/admin/AdminKitchen.vue";
import EmployeeManagement from "@/views/admin/EmployeeManagement.vue";
import CustomerAccounts from "@/views/admin/CustomerAccounts.vue";
const AdminReportsPage = () => import("@/features/admin/reports/pages/AdminReportsPage.vue");
import AdminReviews from "@/views/admin/AdminReviews.vue";
import BranchManagement from "@/views/admin/BranchManagement.vue";

const AdminTablesPage = () =>
  import("@/features/admin/tables/pages/AdminTablesPage.vue");
const AdminMenuView = () => import("@/views/admin/AdminMenuView.vue");
const OperationLogsPage = () =>
  import("@/features/admin/operation-logs/pages/OperationLogsPage.vue");

export const adminChildRoutes = [
  {
    path: "admin",
    name: "AdminDashboard",
    component: AdminDashboard,
    meta: { allowedRoles: ["admin", "waiter"] },
  },
  {
    path: "admin/tables",
    name: "AdminTables",
    component: AdminTablesPage,
    meta: { allowedRoles: ["admin", "waiter"] },
  },
  {
    path: "admin/kitchen",
    name: "AdminKitchen",
    component: AdminKitchen,
    meta: { allowedRoles: ["admin", "kitchen"] },
  },
  {
    path: "admin/menu",
    name: "AdminMenu",
    component: AdminMenuView,
    meta: { allowedRoles: ["admin", "manager", "waiter"] },
  },
  {
    path: "admin/employees",
    name: "EmployeeManagement",
    component: EmployeeManagement,
    meta: { allowedRoles: ["admin"] },
  },
  {
    path: "admin/customer-accounts",
    name: "CustomerAccounts",
    component: CustomerAccounts,
    meta: { allowedRoles: ["admin"] },
  },
  {
    path: "admin/reports",
    name: "AdminReports",
    component: AdminReportsPage,
    meta: { allowedRoles: ["admin", "manager"] },
  },
  {
    path: "admin/reviews",
    name: "AdminReviews",
    component: AdminReviews,
    meta: { allowedRoles: ["admin", "manager"] },
  },
  {
    path: "admin/branches",
    name: "AdminBranches",
    component: BranchManagement,
    meta: { allowedRoles: ["admin"] },
  },
  {
    path: "admin/my-branch",
    name: "MyBranchManagement",
    component: BranchManagement,
    meta: { allowedRoles: ["manager", "admin"] },
  },
  {
    path: "admin/operation-logs",
    name: "OperationLogs",
    component: OperationLogsPage,
    meta: { allowedRoles: ["admin"] },
  },
];
