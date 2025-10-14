<template>
  <el-container class="admin-layout">
    <el-container direction="vertical" class="right-section">
      <Navbar />

      <el-main class="admin-main">
        <Sidebar />
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import Sidebar from "../components/AdminSidebar.vue";
import Navbar from "../components/UserNavbar.vue";
</script>

<style scoped>
.el-container {
  height: 100vh;
  overflow: hidden;
}
.admin-layout {
  height: 100vh;
  overflow: hidden;
}

.admin-main {
  background-color: #f0e9dc;
  padding: 20px;
  display: flex;
  overflow: hidden;
}
</style>
