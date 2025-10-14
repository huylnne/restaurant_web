import { createRouter, createWebHistory } from 'vue-router';
import AdminLayout from "../layouts/AdminLayout.vue";
import Home from '../views/Home.vue';
import AdminDashboard from "../views/admin/AdminDashboard.vue";
const routes = [
  
  {
    path: '/menu',
    name: 'Menu',
    component:() => import('@/views/MenuView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/',
    name: 'Home',
    component:Home 
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue')
  },
  {
    path: '/dashboard',
    name: 'UserDashboard',
    component: () => import('@/views/UserDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: () => import('@/views/UserProfile.vue')
  },
  {
    path: '/order-menu',
    name: 'OrderMenu',        
    component: () => import('@/views/Ordermenu.vue')
  },
  {
    path:"/booking",
    name:"Booking",
    component: () => import('@/views/Booking.vue')
  },
  {
    path: "/admin",
    component: AdminLayout,
    children: [
      {
        path: "",
        name: "AdminDashboard",
        component: AdminDashboard,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;

