/**
 * ROUTER (FE) — khai báo bảng định tuyến gốc và gắn navigation guard (kiểm tra đăng nhập/quyền).
 */
import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "@/layouts/AdminLayout.vue";
import { registerNavigationGuards } from "@/router/guards";
import { publicChildRoutes } from "@/router/routes/public";
import { adminChildRoutes } from "@/router/routes/admin";

// Lazy-load 2 trang đứng riêng (login/register) — không nằm trong AdminLayout để không hiện sidebar.
const LoginView = () => import("@/views/LoginView.vue");
const RegisterView = () => import("@/views/RegisterView.vue");

const routes = [
  { path: "/login", name: "Login", component: LoginView },
  { path: "/register", name: "Register", component: RegisterView },
  {
    // Mọi route còn lại bọc trong AdminLayout (có header/sidebar), gồm cả trang khách và trang quản trị.
    path: "/",
    component: AdminLayout,
    children: [...publicChildRoutes, ...adminChildRoutes],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

registerNavigationGuards(router);

export default router;
