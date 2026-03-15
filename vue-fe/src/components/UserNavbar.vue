<template>
  <div class="header-wrapper">
    <div class="home-page_header">
      <!-- Top Bar -->
      <div class="top-bar">
        <span>Chào mừng bạn đến với HLFood!</span>
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
          <img src="/images/logo.png" alt="HLFood Logo" class="logo" />
        </div>
        <div class="info-items">
          <div class="info">
            <span class="icon">🕒</span>
            <div><strong>OPEN:</strong><br />8AM - 10PM</div>
          </div>
          <div class="info">
            <span class="icon">✉️</span>
            <div><strong>EMAIL:</strong><br />huytdtm@gmail.com</div>
          </div>
          <div class="info">
            <span class="icon">📞</span>
            <div><strong>HOTLINE:</strong><br />0879530869</div>
          </div>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="nav-menu">
        <router-link
          :to="isStaff ? staffHomePath : (isLoggedIn ? '/dashboard' : '/')"
          class="nav-link"
          active-class="active"
          >TRANG CHỦ</router-link
        >
        <router-link to="/about" class="nav-link" active-class="active"
          >GIỚI THIỆU</router-link
        >
        <router-link to="/menu" class="nav-link" active-class="active"
          >THỰC ĐƠN</router-link
        >
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

        <div class="nav-menu_icon">
          <el-icon><Search /></el-icon>
          <el-icon><ShoppingCart /></el-icon>
        </div>
      </nav>

      <div class="zigzag-border"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { Search, ShoppingCart, SwitchButton } from "@element-plus/icons-vue";
import axios from "axios";
import { isStaffRole as checkStaffRole, getDefaultStaffPath } from "@/utils/auth.js";
import { ElMessageBox } from "element-plus";

const router = useRouter();
const user = ref(null);
const isLoggedIn = ref(false);
const isStaff = computed(() => !!user.value && checkStaffRole(user.value.role));
const staffHomePath = computed(() => getDefaultStaffPath(user.value?.role) || "/admin");

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
  isLoggedIn.value = false;
  user.value = null;
  router.push("/").then(() => location.reload());
};

onMounted(async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await axios.get("http://localhost:3000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      user.value = res.data;
      isLoggedIn.value = true;
      console.log("User info:", user.value);
    } catch (err) {
      console.error("Token lỗi hoặc hết hạn:", err);
    }
  }
});

const DEFAULT_AVATAR = "https://maunhi.com/wp-content/uploads/2025/04/avatar-facebook-mac-dinh-3.jpeg";

const getAvatarUrl = (path) => {
  if (path === null || path === undefined || (typeof path === "string" && !path.trim())) {
    return DEFAULT_AVATAR;
  }
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return `http://localhost:3000${path}`;
  return path;
};

const scrollToAllDishes = () => {
  const section = document.querySelector('[ref="allDishesSection"]');
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
};
</script>

<style scoped>
.header-wrapper {
  background-color: var(--hl-bg-page);
  width: 100vw;
}

.home-page_header {
  max-width: var(--hl-content-max);
  margin: 0 auto;
  padding: 0 var(--hl-space-lg);
  width: 100%;
  position: relative;
  overflow: visible;
}
.header-divider {
  height: 1px;
  border-bottom: 1px dashed var(--hl-divider-dashed);
  width: 100vw;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 0;
}
.top-bar {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  height: var(--hl-nav-height);
  line-height: var(--hl-nav-height);
  align-items: center;
  color: var(--hl-text-secondary);
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
  height: var(--hl-header-height);
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
.icon {
  font-size: 18px;
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
  height: var(--hl-nav-height);
  align-items: center;
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
.nav-menu_icon {
  margin-left: auto;
  display: flex;
  gap: var(--hl-space-lg);
  align-items: center;
}
.nav-menu_icon .el-icon {
  font-size: 22px;
  color: var(--hl-text-secondary);
}
.nav-menu_icon .el-icon:hover {
  cursor: pointer;
  color: var(--hl-primary);
}
.zigzag-border {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
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
@media (max-width: 768px) {
  .middle-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--hl-space-lg);
  }
  .info-items {
    flex-direction: column;
    gap: var(--hl-space-md);
  }
  .nav-menu {
    flex-wrap: wrap;
    gap: var(--hl-space-sm);
  }
}
</style>
