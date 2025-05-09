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
  }
  
  
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;

