<template>
  <el-container class="admin-layout">
    <el-container direction="vertical" class="right-section admin-right-section">
      <Navbar />
      <el-main class="admin-main">
        <!-- Sidebar chỉ hiển thị ở route admin trên màn đủ rộng -->
        <Sidebar v-if="showSidebar" />
        <div class="content-wrapper" :class="{ 'no-sidebar': !showSidebar }">
          <div class="content-stack">
            <router-view />
            <SiteFooter />
          </div>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Sidebar from "../components/AdminSidebar.vue";
import Navbar from "../components/UserNavbar.vue";
import SiteFooter from "../components/SiteFooter.vue";
import { isStaffRole as checkStaffRole } from "@/utils/auth.js";

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

onMounted(() => {
  checkStaff();
  handleResize();
  window.addEventListener("resize", handleResize);
});
watch(
  () => router.currentRoute.value.path,
  () => {
    checkStaff();
  }
);
window.addEventListener("storage", checkStaff);

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("storage", checkStaff);
});
</script>

<style scoped>
.admin-layout {
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.admin-right-section {
  flex: 1;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden;
}

.admin-right-section :deep(.header-wrapper) {
  flex-shrink: 0;
}

.admin-main {
  flex: 1;
  min-height: 0 !important;
  height: auto !important;
  background-color: var(--hl-bg-section);
  padding: 0 !important;
  display: flex;
  align-items: stretch;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.content-wrapper {
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: var(--hl-space-lg);
  padding-bottom: var(--hl-space-2xl);
  overflow-x: auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.content-wrapper.no-sidebar {
  width: 100%;
}

.content-stack {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
}

@media (max-width: 992px) {
  .admin-layout {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .admin-right-section {
    overflow: visible;
  }

  .admin-main {
    flex-direction: column;
    overflow: visible;
  }

  .content-wrapper,
  .content-wrapper.no-sidebar {
    width: 100%;
    min-height: auto;
    overflow: visible;
    padding: var(--hl-space-md);
  }
}
</style>
