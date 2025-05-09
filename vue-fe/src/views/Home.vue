<template>
  <div class="home-page">
    <!-- Top Bar -->
    <div class="home-page_header">
      <div class="top-bar">
        <span>Chào mừng bạn đến với HLFood!</span>
        <div class="right-links">
          <a href="#">Trang chủ</a>
          <a href="#">Giới thiệu</a>
          <a href="#">Sản phẩm</a>
          <a href="#">Khuyến mãi</a>
          <a href="#">Tin tức</a>
          <a href="#">Liên hệ</a>
          <a href="#">Tài khoản</a>
        </div>
      </div>
      <!-- Đặt ngay dưới <body> hoặc ngoài .container -->
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

      <!-- Middle Info Bar -->
      <!-- Middle Info Bar -->
      <div class="middle-bar">
        <div class="logo-wrapper">
          <img
            src="C:\Users\Administrator\OneDrive\Documents\code\.vscode\codeday\restaurant_web\vue-fe\public\images\logo.png"
            alt="HLFood Logo"
            class="logo"
          />
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

      <!-- Nav Menu -->
      <nav class="nav-menu">
        <a href="#">TRANG CHỦ</a>
        <a href="#">GIỚI THIỆU</a>
        <div class="dropdown">
          <span>SẢN PHẨM ▾</span>
          <div class="dropdown-content">
            <a href="#">Món 1</a>
            <a href="#">Món 2</a>
          </div>
        </div>
        <a href="#">KHUYẾN MÃI</a>
        <a href="#">TIN TỨC</a>
        <a href="#">LIÊN HỆ</a>
        <div class="nav-menu_icon">
          <el-icon>
            <Search />
          </el-icon>
          <el-icon>
            <ShoppingCart />
          </el-icon>
        </div>
      </nav>
      <div class="zigzag-border"></div>
    </div>
    <div class="home-page_body"></div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();
import { Search } from "@element-plus/icons-vue";
import { ShoppingCart } from "@element-plus/icons-vue";
</script>

<style scoped>
.home-page {
  background-color: #fffaf3;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.home-page_header {
  max-width: 1200px; /* hoặc 1280px, tuỳ bạn */
  margin: 0 auto; /* ✅ căn giữa ngang */
  padding: 0 20px; /* tránh dính mép ở mobile */
  width: 100%;
  position: relative;
  overflow: visible;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  height: 60px;
  line-height: 60px;
  align-items: center;
}

.right-links a {
  margin-left: 15px;
  color: #333;
  text-decoration: none;
}

.right-links a:hover {
  cursor: pointer;
  color: #f2b94c;
}

.middle-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  height: 80px;
}

.logo-placeholder {
  width: 120px;
  height: 60px;
}

.info-items {
  display: flex;
  gap: 30px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon {
  font-size: 18px;
}

.logo-wrapper {
  width: 160px;
  height: 80px; /* ✅ Logo sẽ theo chiều cao của middle-bar */
  aspect-ratio: 3 / 1; /* ✅ Giữ tỉ lệ ngang của logo */
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
  gap: 30px;
  margin-top: 10px;
  font-weight: bold;

  padding-top: 10px;
  height: 60px;
  align-items: center;
}

.nav-menu a,
.nav-menu .dropdown > span {
  text-decoration: none;
  color: #333;
  cursor: pointer;
}

.nav-menu a:hover {
  cursor: pointer;
  color: #f2b94c;
}

.dropdown {
  position: relative;
}

.dropdown-content {
  display: none;
  position: absolute;
  top: 120%;
  left: 0;
  background-color: white;
  border: 1px solid #ccc;
  padding: 10px;
  flex-direction: column;
  gap: 5px;
  z-index: 100;
}

.nav-menu .dropdown > span:hover {
  color: #f2b94c; /* hoặc bất kỳ màu nào bạn muốn khi hover */
}

.dropdown:hover .dropdown-content {
  display: flex;
}

@media (max-width: 768px) {
  .middle-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .info-items {
    flex-direction: column;
    gap: 15px;
  }

  .nav-menu {
    flex-wrap: wrap;
    gap: 10px;
  }
}

.nav-menu_icon {
  margin-left: auto;
  display: flex;
  gap: 20px;
  align-items: center;
}

.nav-menu_icon .el-icon {
  font-size: 22px; /* hoặc 24px, tuỳ bạn */
}

.nav-menu_icon .el-icon:hover {
  cursor: pointer;
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

.home-page_body {
  background-color: #f0e9dc;
  min-height: 100vh;
}
</style>
