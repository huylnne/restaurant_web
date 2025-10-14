<template>
  <el-menu
    class="sidebar"
    background-color="#78350f"
    text-color="#fff"
    active-text-color="#fff"
    default-active="1"
  >
    <el-menu-item index="1">
      <el-icon><KnifeFork /></el-icon>
      <span>Quản lý nhà hàng</span>
    </el-menu-item>

    <el-menu-item index="2">
      <el-icon><Grid /></el-icon>
      <span>Tổng quan</span>
    </el-menu-item>

    <el-menu-item index="3">
      <el-icon><DataLine /></el-icon>
      <span>Thống kê doanh thu</span>
    </el-menu-item>

    <el-menu-item index="4">
      <el-icon><User /></el-icon>
      <span>Quản lý nhân viên</span>
    </el-menu-item>

    <el-menu-item index="5">
      <el-icon><Dish /></el-icon>
      <span>Quản lý món ăn</span>
    </el-menu-item>

    <el-menu-item index="6">
      <el-icon><Grid /></el-icon>
      <span>Quản lý bàn</span>
    </el-menu-item>

    <el-menu-item index="7">
      <el-icon><Setting /></el-icon>
      <span>Cài đặt</span>
    </el-menu-item>
  </el-menu>
</template>

<script setup>
import { KnifeFork, Grid, DataLine, User, Dish, Setting } from "@element-plus/icons-vue";
</script>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  border-right: none;
  background-color: #78350f;
  padding-top: 10px;
}

.el-menu-item {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  margin: 5px 10px;
  transition: 0.3s;
}

.el-menu-item .el-icon {
  color: #f97316; /* cam */
}

.el-menu-item.is-active {
  background-color: #f97316 !important; /* nền cam khi active */
  color: #fff !important;
}

.el-menu-item.is-active .el-icon {
  color: #fff !important;
}

.el-menu-item:hover {
  background-color: rgba(249, 115, 22, 0.2);
}
</style>
