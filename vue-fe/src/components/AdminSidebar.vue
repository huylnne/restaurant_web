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
import { computed } from "vue";
import { useRoute } from "vue-router";
import { KnifeFork, Grid, DataLine, User, Dish, Setting, OfficeBuilding } from "@element-plus/icons-vue";
import { getMenuByRole } from "@/config/sidebarMenu.js";
import { getCurrentRole } from "@/utils/auth.js";

const route = useRoute();

const role = computed(() => getCurrentRole());
const visibleMenus = computed(() => getMenuByRole(role.value));

const iconMap = {
  KnifeFork,
  Grid,
  DataLine,
  User,
  Dish,
  Setting,
  OfficeBuilding,
};
function iconComponent(name) {
  return iconMap[name] || Grid;
}

/** Active menu theo route hiện tại */
const activeMenuKey = computed(() => {
  const path = route.path;
  const idx = visibleMenus.value.findIndex((item) => item.route === path);
  if (idx >= 0) return String(idx + 1);
  const byRoute = visibleMenus.value.find((item) => item.route && path.startsWith(item.route));
  if (byRoute) return String(visibleMenus.value.indexOf(byRoute) + 1);
  return "1";
});
</script>

<style scoped>
.sidebar {
  width: 240px;
  height: 100%;
  border-right: none;
  background-color: var(--hl-sidebar-bg);
  padding-top: var(--hl-space-sm);
}

.el-menu-item {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
  border-radius: var(--hl-radius-md);
  margin: var(--hl-space-xs) var(--hl-space-sm);
  transition: 0.2s ease;
  text-decoration: none;
}

.el-menu-item .el-icon {
  color: var(--hl-sidebar-icon);
}

.el-menu-item.is-active {
  background-color: var(--hl-sidebar-active) !important;
  color: #fff !important;
}

.el-menu-item.is-active .el-icon {
  color: #fff !important;
}

.el-menu-item:hover {
  background-color: var(--hl-sidebar-active-bg);
}
</style>
