<template>
  <div class="admin-layout">
    <Navbar />
    <div class="admin-body" :class="{ 'admin-body--with-sidebar': showSidebar }">
      <Sidebar v-if="showSidebar" class="admin-sidebar-panel" />
      <main class="content-wrapper" :class="{ 'content-wrapper--full': !showSidebar }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Sidebar from "../components/AdminSidebar.vue";
import Navbar from "../components/UserNavbar.vue";
import { isStaffRole as checkStaffRole } from "@/utils/auth.js";
import { connectBranchRealtime } from "@/utils/branchRealtime";
import {
  canReceiveKitchenDoneAlerts,
  handleKitchenRealtimeMessage,
} from "@/utils/kitchenDoneAlert";
import { getCurrentUser, getDefaultBranchIdForUser } from "@/utils/adminScope";

const HTTP_ORIGIN = "http://localhost:3000";
let disposeStaffKitchenWs = null;

function stopStaffKitchenWs() {
  if (typeof disposeStaffKitchenWs === "function") {
    disposeStaffKitchenWs();
    disposeStaffKitchenWs = null;
  }
}

/** Phục vụ: toast món xong trên mọi trang admin (WS theo chi nhánh cố định) */
function startStaffKitchenWs() {
  stopStaffKitchenWs();
  const user = getCurrentUser();
  if (!canReceiveKitchenDoneAlerts()) return;
  if (user?.role === "admin") return;
  if (!localStorage.getItem("token")) return;
  disposeStaffKitchenWs = connectBranchRealtime(
    HTTP_ORIGIN,
    getDefaultBranchIdForUser(user),
    (msg) => {
      handleKitchenRealtimeMessage(msg);
      window.dispatchEvent(new CustomEvent("branch-realtime", { detail: msg }));
    }
  );
}

const isStaffRole = ref(false);
const isCompactViewport = ref(typeof window !== "undefined" ? window.innerWidth <= 992 : false);
const router = useRouter();
const route = useRoute();

function checkStaff() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  isStaffRole.value = !!token && checkStaffRole(user.role);
}

function handleResize() {
  isCompactViewport.value = window.innerWidth <= 992;
}

const showSidebar = computed(
  () => isStaffRole.value && route.path.startsWith("/admin") && !isCompactViewport.value
);

function syncAdminBodyClass() {
  document.body.classList.toggle("admin-route-active", route.path.startsWith("/admin"));
}

function onAuthStorageChange() {
  checkStaff();
  startStaffKitchenWs();
}

onMounted(() => {
  checkStaff();
  handleResize();
  syncAdminBodyClass();
  startStaffKitchenWs();
  window.addEventListener("resize", handleResize);
});
watch(
  () => router.currentRoute.value.path,
  () => {
    checkStaff();
    syncAdminBodyClass();
    startStaffKitchenWs();
  }
);
window.addEventListener("storage", onAuthStorageChange);

onUnmounted(() => {
  stopStaffKitchenWs();
  document.body.classList.remove("admin-route-active");
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("storage", onAuthStorageChange);
});
</script>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--hl-admin-bg);
}

.admin-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  width: 100%;
  overflow: hidden;
}

.admin-body--with-sidebar :deep(.admin-sidebar-panel) {
  flex-shrink: 0;
}

.content-wrapper {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: var(--hl-space-md) var(--hl-space-lg);
  box-sizing: border-box;
}

.content-wrapper--full {
  width: 100%;
}

@media (max-width: 992px) {
  .admin-layout {
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    overflow: visible;
  }

  .admin-body {
    flex-direction: column;
    overflow: visible;
  }

  .content-wrapper {
    overflow: visible;
    padding: var(--hl-space-md);
  }
}
</style>
