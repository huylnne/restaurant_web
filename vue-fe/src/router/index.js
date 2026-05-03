import { createRouter, createWebHistory } from 'vue-router';
import AdminLayout from "../layouts/AdminLayout.vue";
import Home from '../views/Home.vue';
import AdminDashboard from "../views/admin/AdminDashboard.vue";
import AdminTables from "../views/admin/AdminTables.vue";
import AdminKitchen from "../views/admin/AdminKitchen.vue";
import EmployeeManagement from "../views/admin/EmployeeManagement.vue";
import AdminReports from "../views/admin/AdminReports.vue";
import BranchManagement from "../views/admin/BranchManagement.vue";
import { getDefaultStaffPath, canAccessRoute, isStaffRole } from '@/utils/auth.js';

// Import các view khác nếu cần
const MenuView = () => import('@/views/MenuView.vue');
const LoginView = () => import('../views/LoginView.vue');
const RegisterView = () => import('../views/RegisterView.vue');
const UserDashboard = () => import('@/views/UserDashboard.vue');
const UserProfile = () => import('@/views/UserProfile.vue');
const OrderMenu = () => import('@/views/Ordermenu.vue');
const Booking = () => import('@/views/Booking.vue');
const MyTable = () => import('@/views/MyTable.vue');
const TableQr = () => import('@/views/TableQr.vue');

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
  },
  {
    path: '/',
    component: AdminLayout,
    children: [
      { path: '', name: 'Home', component: Home },
      { path: 'menu', name: 'Menu', component: MenuView },
      { path: 'booking', name: 'Booking', component: Booking },
      { path: 'order-menu', name: 'OrderMenu', component: OrderMenu },
      { path: 'dashboard', name: 'UserDashboard', component: UserDashboard, meta: { requiresAuth: true } },
      { path: 'profile', name: 'UserProfile', component: UserProfile },
      { path: 'my-table', name: 'MyTable', component: MyTable, meta: { requiresAuth: true } },
      { path: 't/:token', name: 'TableQr', component: TableQr },
      // Routes quản lý: meta.allowedRoles – kitchen chỉ được vào /admin/kitchen
      { path: 'admin', name: 'AdminDashboard', component: AdminDashboard, meta: { allowedRoles: ['admin', 'waiter'] } },
      { path: 'admin/tables', name: 'AdminTables', component: AdminTables, meta: { allowedRoles: ['admin', 'waiter'] } },
      { path: 'admin/kitchen', name: 'AdminKitchen', component: AdminKitchen, meta: { allowedRoles: ['admin', 'waiter', 'kitchen'] } },
      { path: 'admin/menu', name: 'AdminMenu', component: MenuView, meta: { allowedRoles: ['admin', 'waiter'] } },
      { path: 'admin/employees', name: 'EmployeeManagement', component: EmployeeManagement, meta: { allowedRoles: ['admin'] } },
      { path: 'admin/reports', name: 'AdminReports', component: AdminReports, meta: { allowedRoles: ['admin'] } },
      { path: 'admin/branches', name: 'AdminBranches', component: BranchManagement, meta: { allowedRoles: ['admin'] } },
      { path: 'admin/my-branch', name: 'MyBranchManagement', component: BranchManagement, meta: { allowedRoles: ['manager', 'admin'] } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation guard: phân quyền theo meta.allowedRoles
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user?.role || null;
  const isStaff = isStaffRole(role);

  // Route yêu cầu role (allowedRoles)
  if (to.meta.allowedRoles) {
    if (!token) {
      next('/login');
      return;
    }
    if (!canAccessRoute(role, to.meta)) {
      next(getDefaultStaffPath(role) || '/admin');
      return;
    }
    next();
    return;
  }

  // Staff vào /dashboard hoặc /my-table thì chuyển sang trang quản lý mặc định
  if (to.path === '/dashboard' && isStaff) {
    next(getDefaultStaffPath(role));
    return;
  }
  if (to.path === '/my-table' && isStaff) {
    next(getDefaultStaffPath(role));
    return;
  }

  next();
});

export default router;