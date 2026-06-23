<template>
  <div class="header-wrapper" :class="{ 'header-wrapper--admin': isAdminRoute }">
    <header v-if="isAdminRoute" class="admin-compact-header">
      <router-link to="/" class="admin-compact-header__brand">
        <img :src="BRAND.logo" :alt="BRAND.name" class="admin-compact-header__logo" />
        <span class="admin-compact-header__title">{{ BRAND.name }}</span>
      </router-link>
      <nav class="admin-compact-header__nav">
        <router-link to="/" class="admin-compact-header__link">Trang chủ</router-link>
        <router-link to="/menu" class="admin-compact-header__link">Thực đơn</router-link>
        <router-link :to="staffHomePath" class="admin-compact-header__link">Quản lý</router-link>
        <el-dropdown
          v-if="adminMenus.length"
          class="admin-mobile-menu"
          trigger="click"
          @command="goToAdminMenu"
        >
          <el-button text class="admin-mobile-menu__button">Menu quản lý</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="item in adminMenus"
                :key="item.key"
                :command="item.route"
              >
                {{ item.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </nav>
      <div class="admin-compact-header__actions">
        <template v-if="isLoggedIn">
          <router-link to="/profile" class="nav-user">
            <el-avatar :size="28" :src="getAvatarUrl(user?.avatar || user?.avatar_url)" />
            <span class="username">{{ user?.name || user?.full_name }}</span>
          </router-link>
          <el-button type="text" class="logout-button" @click="logout">
            <el-icon><SwitchButton /></el-icon>
            <span>Đăng xuất</span>
          </el-button>
        </template>
        <router-link v-else to="/login" class="admin-compact-header__link">Đăng nhập</router-link>
      </div>
    </header>

    <div v-else class="home-page_header">
      <!-- Top Bar -->
      <div class="top-bar">
        <span>Chào mừng bạn đến với {{ BRAND.name }}!</span>
        <router-link to="/branches/nearby" class="top-bar-branches">Chi nhánh gần bạn</router-link>
        <div class="right-links">
          <template v-if="!isLoggedIn">
            <router-link to="/login" class="nav-link" active-class="active">
              TÀI KHOẢN
            </router-link>
          </template>
          <template v-else>
            <div class="nav-user-loggedin">
              <router-link to="/profile" class="nav-user">
                <el-avatar :size="28" :src="getAvatarUrl(user.avatar || user.avatar_url)" />
                <span class="username">{{ user.name || user.full_name }}</span>
              </router-link>
              <router-link
                v-if="!isStaff"
                to="/my-table"
                class="nav-link nav-link--small"
                active-class="active"
              >
                Bàn của tôi
              </router-link>
              <el-button type="text" @click="logout" class="logout-button">
                <el-icon><SwitchButton /></el-icon>
                <span>Đăng xuất</span>
              </el-button>
            </div>
          </template>
        </div>
      </div>

      <div class="header-divider"></div>

      <!-- Middle Bar -->
      <div class="middle-bar">
        <div class="logo-wrapper">
          <img :src="BRAND.logo" :alt="`${BRAND.name} Logo`" class="logo" />
        </div>
        <div class="info-items">
          <div class="info">
            <el-icon class="info-icon"><Clock /></el-icon>
            <div><strong>OPEN:</strong><br />{{ BRAND.hoursDisplay }}</div>
          </div>
          <div class="info">
            <el-icon class="info-icon"><Message /></el-icon>
            <div><strong>EMAIL:</strong><br />{{ BRAND.email }}</div>
          </div>
          <div class="info">
            <el-icon class="info-icon"><Phone /></el-icon>
            <div><strong>HOTLINE:</strong><br />{{ BRAND.hotline }}</div>
          </div>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="nav-menu">
        <router-link
          :to="isLoggedIn && !isStaff ? '/dashboard' : '/'"
          class="nav-link"
          exact-active-class="active"
          >TRANG CHỦ</router-link
        >
        <router-link to="/about" class="nav-link" active-class="active"
          >GIỚI THIỆU</router-link
        >
        <router-link to="/menu" class="nav-link" active-class="active"
          >THỰC ĐƠN</router-link
        >
        <router-link to="/branches" class="nav-link" active-class="active">CHI NHÁNH</router-link>
        <router-link
          to="/branches/nearby"
          class="nav-link nav-link--nearby"
          :class="{ 'nav-cta-branches': !isAdminRoute }"
          active-class="active"
        >
          <el-icon v-if="!isAdminRoute"><Location /></el-icon>
          {{ isAdminRoute ? 'GẦN BẠN' : 'Gần bạn' }}
        </router-link>
        <router-link to="/sale" class="nav-link" active-class="active"
          >KHUYẾN MÃI</router-link
        >
        <router-link to="/news" class="nav-link" active-class="active"
          >TIN TỨC</router-link
        >
        <router-link to="/contact" class="nav-link" active-class="active"
          >LIÊN HỆ</router-link
        >
        <template v-if="isLoggedIn && isStaff">
          <router-link :to="staffHomePath" class="nav-link admin-link" active-class="active">
            Quản lý nhà hàng
          </router-link>
        </template>
      </nav>

      <div class="zigzag-border"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { SwitchButton, Location, Clock, Message, Phone } from "@element-plus/icons-vue";
import axios from "axios";
import { isStaffRole as checkStaffRole, getDefaultStaffPath } from "@/utils/auth.js";
import { ElMessage, ElMessageBox } from "element-plus";
import { BRAND } from "@/config/siteContent";
import { apiUrl } from "@/config/api";
import { getMenuByRole } from "@/config/sidebarMenu.js";

const router = useRouter();
const route = useRoute();
const isAdminRoute = computed(() => route.path.startsWith("/admin"));
const user = ref(null);
const isLoggedIn = ref(false);

// Lưu role từ localStorage (vì API /users/me có thể không trả về role)
const storedUserRole = ref(null);

const isStaff = computed(() => {
  const role = user.value?.role || storedUserRole.value;
  return !!role && checkStaffRole(role);
});

const staffHomePath = computed(() => getDefaultStaffPath(user.value?.role || storedUserRole.value) || "/admin");
const adminMenus = computed(() =>
  getMenuByRole(user.value?.role || storedUserRole.value).filter((item) => item.route)
);

function goToAdminMenu(routePath) {
  if (routePath) router.push(routePath);
}

const logout = async () => {
  try {
    await ElMessageBox.confirm("Bạn có chắc muốn đăng xuất?", "Xác nhận", {
      confirmButtonText: "Đăng xuất",
      cancelButtonText: "Hủy",
      type: "warning",
    });
  } catch {
    return;
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  isLoggedIn.value = false;
  user.value = null;
  ElMessage.success("Đã đăng xuất");
  router.push("/").then(() => location.reload());
};

onMounted(async () => {
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  if (storedUser && storedUser.role) {
    storedUserRole.value = storedUser.role;
  }
  if (token) {
    try {
      const res = await axios.get("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      user.value = res.data;
      isLoggedIn.value = true;
    } catch (err) {
      console.error("Token lỗi hoặc hết hạn:", err);
      ElMessage.warning("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }
});

const DEFAULT_AVATAR = "https://maunhi.com/wp-content/uploads/2025/04/avatar-facebook-mac-dinh-3.jpeg";

const getAvatarUrl = (path) => {
  if (path === null || path === undefined || (typeof path === "string" && !path.trim())) {
    return DEFAULT_AVATAR;
  }
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return apiUrl(path);
  return path;
};
</script>

<style scoped>
.header-wrapper {
  background-color: var(--hl-bg-page);
  width: 100%;
  max-width: 100%;
  flex-shrink: 0;
}

.header-wrapper--admin {
  background: transparent;
}

.home-page_header {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0 clamp(var(--hl-space-md), 3vw, var(--hl-space-2xl));
  position: relative;
  overflow: visible;
  box-sizing: border-box;
}
.header-divider {
  height: 1px;
  border-bottom: 1px dashed var(--hl-divider-dashed);
  width: 100%;
  margin: 0;
  padding: 0;
}
.top-bar-branches {
  color: var(--hl-primary);
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  margin-left: var(--hl-space-md);
}

.top-bar-branches:hover {
  text-decoration: underline;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  min-height: var(--hl-nav-height);
  line-height: 1.4;
  align-items: center;
  color: var(--hl-text-secondary);
  padding: 10px 0;
  gap: var(--hl-space-sm);
  flex-wrap: wrap;
}
.right-links {
  display: flex;
  gap: var(--hl-space-sm);
}
.right-links a {
  margin-left: var(--hl-space-md);
  color: var(--hl-text);
  text-decoration: none;
}
.right-links a:hover {
  cursor: pointer;
  color: var(--hl-primary);
}
.middle-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--hl-space-sm) 0;
  min-height: var(--hl-header-height);
  gap: var(--hl-space-md);
}
.info-items {
  display: flex;
  gap: var(--hl-space-xl);
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.info {
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
}
.info-icon {
  font-size: 20px;
  color: var(--hl-primary);
  flex-shrink: 0;
  margin-top: 2px;
}
.logo-wrapper {
  width: 160px;
  height: var(--hl-header-height);
  aspect-ratio: 3 / 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo {
  width: 100%;
  height: auto;
  display: block;
}
.nav-menu {
  display: flex;
  gap: var(--hl-space-xl);
  margin-top: var(--hl-space-sm);
  font-weight: bold;
  padding-top: var(--hl-space-sm);
  min-height: var(--hl-nav-height);
  align-items: center;
  flex-wrap: wrap;
  row-gap: var(--hl-space-sm);
}
.nav-menu a,
.nav-menu .dropdown > span {
  text-decoration: none;
  color: var(--hl-text);
  cursor: pointer;
}
.nav-menu a:hover,
.nav-menu .dropdown > span:hover {
  color: var(--hl-primary);
}
.dropdown {
  position: relative;
}
.dropdown-content {
  display: none;
  position: absolute;
  top: 120%;
  left: 0;
  background-color: var(--hl-bg-card);
  border: 1px solid var(--hl-border);
  padding: var(--hl-space-sm);
  flex-direction: column;
  gap: var(--hl-space-xs);
  z-index: 100;
  border-radius: var(--hl-radius-md);
  box-shadow: var(--hl-shadow-md);
}
.dropdown:hover .dropdown-content {
  display: flex;
}
.zigzag-border {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 12px;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 60 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23fffaf3' d='M0 0 L5 10 L10 0 L15 10 L20 0 L25 10 L30 0 L35 10 L40 0 L45 10 L50 0 L55 10 L60 0 Z'/%3E%3C/svg%3E")
    repeat-x;
  background-size: auto 100%;
  z-index: 10;
}
.nav-user {
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
  font-weight: bold;
  color: var(--hl-text);
}
.nav-user:hover {
  cursor: pointer;
  color: var(--hl-primary);
}
.username {
  font-size: 14px;
}
.nav-user-loggedin {
  display: flex;
  align-items: center;
  gap: var(--hl-space-md);
}
.logout-button {
  color: var(--hl-text);
  font-size: 14px;
  padding: 0;
}
.logout-button:hover {
  text-decoration: underline;
  cursor: pointer;
  color: var(--hl-primary);
}
.router-link-exact-active,
.nav-link.active {
  color: var(--hl-primary);
  border-bottom: 2px solid var(--hl-primary);
}

.nav-menu .nav-cta-branches {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 8px 16px;
  background: var(--hl-primary);
  color: #fff !important;
  text-decoration: none;
  font-weight: 600;
  font-size: 13px;
  border-radius: var(--hl-radius-md);
  border: none !important;
  white-space: nowrap;
  transition: background 0.2s ease, transform 0.15s ease;
}

.nav-cta-branches:hover {
  background: var(--hl-primary-hover, #3d624f);
  transform: translateY(-1px);
}

.nav-cta-branches--active {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
}

.admin-mobile-menu {
  display: none;
}

.admin-mobile-menu__button {
  color: inherit;
  font-weight: 600;
  padding: 0;
}

@media (max-width: 992px) {
  .admin-compact-header {
    flex-wrap: wrap;
    gap: var(--hl-space-sm);
  }

  .admin-compact-header__nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    justify-content: flex-start;
  }

  .admin-mobile-menu {
    display: inline-flex;
  }

  .admin-compact-header__actions {
    margin-left: auto;
  }

  .admin-compact-header__actions .username,
  .admin-compact-header__actions .logout-button span {
    display: none;
  }
}

@media (max-width: 992px) {
  .nav-cta-branches {
    order: -1;
    margin-left: 0;
    flex: 1 1 100%;
    justify-content: center;
    margin-bottom: 4px;
  }
}
@media (max-width: 768px) {
  .home-page_header {
    padding: 0 var(--hl-space-md);
  }

  .top-bar {
    font-size: 12px;
    min-height: auto;
    padding: 8px 0;
  }

  .right-links {
    width: 100%;
    justify-content: space-between;
  }

  .middle-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--hl-space-lg);
    min-height: auto;
    padding-bottom: var(--hl-space-md);
  }

  .info-items {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--hl-space-md);
  }

  .info {
    min-width: 0;
    width: 100%;
    align-items: flex-start;
  }

  .info div {
    font-size: 12px;
    line-height: 1.4;
    word-break: break-word;
  }

  .nav-menu {
    height: auto;
    min-height: auto;
    gap: var(--hl-space-sm) var(--hl-space-md);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    padding: 0 0 var(--hl-space-sm);
    margin-top: 0;
  }

  .nav-menu .nav-link {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}

@media (max-width: 480px) {
  .top-bar-branches {
    margin-left: 0;
    width: 100%;
  }

  .nav-user-loggedin {
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>
