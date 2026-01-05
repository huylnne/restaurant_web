import { createRouter, createWebHistory } from 'vue-router';
import AdminLayout from "../layouts/AdminLayout.vue";
import Home from '../views/Home.vue';
import AdminDashboard from "../views/admin/AdminDashboard.vue";
import AdminTables from "../views/admin/AdminTables.vue";
import EmployeeManagement from "../views/admin/EmployeeManagement.vue";

// Import các view khác nếu cần
const MenuView = () => import('@/views/MenuView.vue');
const LoginView = () => import('../views/LoginView.vue');
const RegisterView = () => import('../views/RegisterView.vue');
const UserDashboard = () => import('@/views/UserDashboard.vue');
const UserProfile = () => import('@/views/UserProfile.vue');
const OrderMenu = () => import('@/views/Ordermenu.vue');
const Booking = () => import('@/views/Booking.vue');

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
      // Admin routes
      { path: 'admin', name: 'AdminDashboard', component: AdminDashboard, meta: { requiresAdmin: true } },
      { path: 'admin/tables', name: 'AdminTables', component: AdminTables, meta: { requiresAdmin: true } },
      { path: 'admin/menu', name: 'AdminMenu', component: MenuView, meta: { requiresAdmin: true } },
      { path: 'admin/employees', name: 'EmployeeManagement', component: EmployeeManagement, meta: { requiresAdmin: true } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation guard cho admin
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = token && user && user.role === 'admin';

  if (to.meta.requiresAdmin && !isAdmin) {
    next('/login');
  } else {
    next();
  }
});

export default router;