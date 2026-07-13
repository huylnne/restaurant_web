<template>
  <el-menu
    class="sidebar"
    background-color="var(--hl-sidebar-bg)"
    text-color="#fff"
    active-text-color="#fff"
    :default-active="activeMenuKey"
  >
    <template v-for="(item, idx) in visibleMenus" :key="item.key">
      <router-link
        v-if="item.route"
        :to="item.route"
        class="nav-item"
        style="text-decoration: none"
      >
        <el-menu-item :index="String(idx + 1)">
          <el-icon>
            <component :is="iconComponent(item.icon)" />
          </el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </router-link>
      <el-menu-item v-else :index="`_${idx}`">
        <el-icon>
          <component :is="iconComponent(item.icon)" />
        </el-icon>
        <span>{{ item.label }}</span>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
// AdminSidebar — menu dọc bên trái khu vực quản lý. Các mục hiển thị lọc theo vai trò đăng nhập.
import { computed } from "vue";
import { useRoute } from "vue-router";
import { KnifeFork, Grid, DataLine, User, Dish, Setting, OfficeBuilding, Document, Clock } from "@element-plus/icons-vue";
import { getMenuByRole } from "@/config/sidebarMenu.js";
import { getCurrentRole } from "@/utils/auth.js";

const route = useRoute();

const role = computed(() => getCurrentRole());                 // vai trò hiện tại
const visibleMenus = computed(() => getMenuByRole(role.value)); // các mục menu được phép thấy

// Ánh xạ tên icon (chuỗi trong cấu hình) → component icon thực tế.
const iconMap = {
  KnifeFork,
  Grid,
  DataLine,
  User,
  Dish,
  Setting,
  OfficeBuilding,
  Document,
  Clock,
};
// Trả về component icon theo tên; không khớp thì dùng Grid mặc định.
function iconComponent(name) {
  return iconMap[name] || Grid;
}

/** Active menu theo route hiện tại */
const activeMenuKey = computed(() => {
  const path = route.path;
  // 1) Khớp chính xác đường dẫn.
  const idx = visibleMenus.value.findIndex((item) => item.route === path);
  if (idx >= 0) return String(idx + 1);
  // 2) Không khớp chính xác → khớp theo tiền tố (vd /admin/tables/123 vẫn active mục /admin/tables).
  const byRoute = visibleMenus.value.find((item) => item.route && path.startsWith(item.route));
  if (byRoute) return String(visibleMenus.value.indexOf(byRoute) + 1);
  return "1"; // mặc định active mục đầu
});
</script>

<style scoped>
.sidebar {
  width: var(--hl-admin-sidebar-width);
  flex: 0 0 var(--hl-admin-sidebar-width);
  height: 100%;
  min-height: 100%;
  align-self: stretch;
  border-right: 1px solid rgba(0, 0, 0, 0.15);
  background: var(--hl-gradient-sidebar);
  padding: var(--hl-space-lg) var(--hl-space-sm);
  min-width: 0;
  box-sizing: border-box;
  overflow-y: auto;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.08);
}

.sidebar :deep(.el-menu) {
  border-right: none;
  background-color: transparent;
}

.el-menu-item {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
  border-radius: var(--hl-radius-md);
  margin: var(--hl-space-xs) var(--hl-space-xs);
  padding-left: var(--hl-space-md) !important;
  transition: 0.2s ease;
  text-decoration: none;
}

.el-menu-item .el-icon {
  color: var(--hl-sidebar-icon);
}

.el-menu-item.is-active {
  background: var(--hl-gradient-primary) !important;
  color: #fff !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.el-menu-item.is-active .el-icon {
  color: #fff !important;
}

.el-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

@media (max-width: 1024px) {
  .sidebar {
    width: 84px;
  }

  .el-menu-item {
    justify-content: center;
    margin: var(--hl-space-xs);
    padding: 0;
  }

  .el-menu-item span {
    display: none;
  }
}
</style>
