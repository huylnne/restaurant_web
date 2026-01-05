<template>
  <el-container class="admin-layout">
    <el-container direction="vertical" class="right-section">
      <Navbar />
      <el-main class="admin-main">
        <!-- Chỉ hiện Sidebar khi là admin -->
        <Sidebar v-if="isAdmin" />
        <div class="content-wrapper" :class="{ 'no-sidebar': !isAdmin }">
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

const isAdmin = ref(false);
const router = useRouter();

function checkAdmin() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  isAdmin.value = !!token && user && user.role === "admin";
}

onMounted(() => {
  checkAdmin();
});
watch(
  () => router.currentRoute.value.path,
  () => {
    checkAdmin();
  }
);
window.addEventListener("storage", checkAdmin);
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
  background-color: #f0e9dc;
  padding: 0;
  display: flex;
  overflow: hidden;
  height: calc(100vh - 80px);
}
.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.content-wrapper.no-sidebar {
  width: 100%;
  padding: 20px;
}
</style>
