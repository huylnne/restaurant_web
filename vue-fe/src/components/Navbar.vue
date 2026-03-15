<template>
  <div class="navbar-wrapper">
    <div class="zigzag-background">
      <div class="home-page_header">
        <div class="top-bar">
          <span>Chào mừng bạn đến với HLFood!</span>
          <div class="right-links">
            <a href="#">Trang chủ</a>
            <a href="#">Giới thiệu</a>
            <a href="#">Khuyến mãi</a>
            <a href="#">Tin tức</a>
            <a href="#">Liên hệ</a>
            <router-link to="/login">Tài khoản</router-link>
          </div>
        </div>

        <div
          style="
            height: 1px;
            border-bottom: 1px dashed #a16500;
            width: 100vw;
            position: relative;
            left: 50%;
            transform: translateX(-50%);
            margin: 0;
            padding: 0;
          "
        ></div>

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

        <nav class="nav-menu">
          <router-link to="/" class="nav-link" active-class="active"
            >TRANG CHỦ</router-link
          >
          <router-link to="/about" class="nav-link" active-class="active"
            >GIỚI THIỆU</router-link
          >

          <div class="dropdown">
            <span>THỰC ĐƠN </span>
          </div>

          <router-link to="/sale" class="nav-link" active-class="active"
            >KHUYẾN MÃI</router-link
          >
          <router-link to="/news" class="nav-link" active-class="active"
            >TIN TỨC</router-link
          >
          <router-link to="/contact" class="nav-link" active-class="active"
            >LIÊN HỆ</router-link
          >

          <div class="nav-menu_icon">
            <el-icon><Search /></el-icon>
            <el-icon><ShoppingCart /></el-icon>
          </div>
        </nav>
      </div>

      <div class="zigzag-border"></div>
    </div>
  </div>
</template>

<script setup>
import { Search, ShoppingCart } from "@element-plus/icons-vue";
</script>

<style scoped>
.navbar-wrapper {
  width: 100%;
}

.zigzag-background {
  background-color: var(--hl-bg-page);
  width: 100%;
  position: relative;
  z-index: 20;
}

.home-page_header {
  max-width: var(--hl-content-max);
  margin: 0 auto;
  padding: 0 var(--hl-space-lg);
  position: relative;
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
  flex-wrap: wrap;
}

.right-links a,
.right-links .nav-link {
  margin-left: var(--hl-space-md);
  color: var(--hl-text);
  text-decoration: none;
}

.right-links a:hover,
.right-links .nav-link:hover {
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
  width: 100%;
  height: 12px;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 60 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23fffaf3' d='M0 0 L5 10 L10 0 L15 10 L20 0 L25 10 L30 0 L35 10 L40 0 L45 10 L50 0 L55 10 L60 0 Z'/%3E%3C/svg%3E")
    repeat-x;
  background-size: auto 100%;
  z-index: 10;
}

.nav-link {
  text-decoration: none;
  color: var(--hl-text);
  font-weight: bold;
}

.nav-link:hover {
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

  .right-links {
    flex-wrap: wrap;
    gap: var(--hl-space-sm);
  }
}
</style>
