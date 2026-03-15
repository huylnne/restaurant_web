<template>
  <el-menu
    class="sidebar"
    background-color="#78350f"
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
import { KnifeFork, Grid, DataLine, User, Dish, Setting } from "@element-plus/icons-vue";
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
  text-decoration: none;
}

.el-menu-item .el-icon {
  color: #f97316;
}

.el-menu-item.is-active {
  background-color: #f97316 !important;
  color: #fff !important;
}

.el-menu-item.is-active .el-icon {
  color: #fff !important;
}

.el-menu-item:hover {
  background-color: rgba(249, 115, 22, 0.2);
}
</style>
