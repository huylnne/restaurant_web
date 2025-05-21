import { createRouter, createWebHistory } from 'vue-router';
import MenuView from '../views/MenuView.vue'; // <-- import MenuView mới
import Home from '../views/Home.vue';
const routes = [
  
  {
    path: '/menu',
    name: 'Menu',
    component: MenuView
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/',
    name: 'Home',
    component:Home // hoặc import trực tiếp nếu bạn không dùng lazy-loading
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
  }
  
    
  
  
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;

