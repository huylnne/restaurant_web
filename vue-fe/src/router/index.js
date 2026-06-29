import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "@/layouts/AdminLayout.vue";
import { registerNavigationGuards } from "@/router/guards";
import { publicChildRoutes } from "@/router/routes/public";
import { adminChildRoutes } from "@/router/routes/admin";

const LoginView = () => import("@/views/LoginView.vue");
const RegisterView = () => import("@/views/RegisterView.vue");

const routes = [
  { path: "/login", name: "Login", component: LoginView },
  { path: "/register", name: "Register", component: RegisterView },
  {
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
