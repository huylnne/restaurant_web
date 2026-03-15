<template>
  <el-container class="admin-layout">
    <el-container direction="vertical" class="right-section">
      <Navbar />
      <el-main class="admin-main">
        <!-- Sidebar hiện khi đăng nhập bằng admin / waiter / kitchen -->
        <Sidebar v-if="isStaffRole" />
        <div class="content-wrapper" :class="{ 'no-sidebar': !isStaffRole }">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import Sidebar from "../components/AdminSidebar.vue";
import Navbar from "../components/UserNavbar.vue";
import { useRouter } from "vue-router";
import { isStaffRole as checkStaffRole } from "@/utils/auth.js";

const isStaffRole = ref(false);
const router = useRouter();

function checkStaff() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  isStaffRole.value = !!token && checkStaffRole(user.role);
}

onMounted(() => {
  checkStaff();
});
watch(
  () => router.currentRoute.value.path,
  () => {
    checkStaff();
  }
);
window.addEventListener("storage", checkStaff);
</script>

<style scoped>
.el-container {
  height: 100%;
}
.admin-layout {
  height: 100vh;
  overflow: hidden;
}
.admin-main {
  background-color: var(--hl-bg-section);
  padding: 0;
  display: flex;
  overflow: hidden;
  height: calc(100vh - var(--hl-header-height, 80px));
}
.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: var(--hl-space-lg);
}
.content-wrapper.no-sidebar {
  width: 100%;
  padding: var(--hl-space-lg);
}
</style>
