<template>
  <div class="home-page">
    <!-- Top Bar -->
    <div class="home-page_header">
      <div class="top-bar">
        <span>Chào mừng bạn đến với HLFood!</span>
        <div class="right-links">
          <template v-if="!isLoggedIn">
            <router-link to="/login" class="nav-link" active-class="active">
              TÀI KHOẢN
            </router-link>
          </template>

          <!-- Nếu đã đăng nhập -->
          <template v-else>
            <div class="nav-user-loggedin">
              <router-link to="/profile" class="nav-user">
                <el-avatar :size="28" :src="getAvatarUrl(user.avatar)" />

                <span class="username">{{ user.name }}</span>
              </router-link>
              <el-button type="text" @click="logout" class="logout-button">
                <el-icon><SwitchButton /></el-icon>
                <span>Đăng xuất</span>
              </el-button>
            </div>
          </template>
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
        <router-link
          :to="isLoggedIn ? '/dashboard' : '/'"
          class="nav-link"
          active-class="active"
        >
          TRANG CHỦ
        </router-link>

        <router-link to="/about" class="nav-link" active-class="active"
          >GIỚI THIỆU</router-link
        >

        <div class="dropdown">
          <span @click="scrollToAllDishes" style="cursor: pointer">THỰC ĐƠN</span>
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

      <div class="zigzag-border"></div>
    </div>
    <div class="home-page_body">
      <div class="container">
        <div class="slider-carousel">
          <div
            class="slider-carousel-track"
            :class="{ 'no-transition': !isTransitionEnabled }"
            :style="{ transform: `translateX(-${currentIndex * 60}vw)` }"
          >
            <img
              v-for="(img, index) in images"
              :key="index"
              :src="img"
              class="slider-carousel-image"
            />
          </div>

          <!-- Nút trái -->
          <button class="arrow left" @click="prevSlide">‹</button>

          <!-- Nút phải -->
          <button class="arrow right" @click="nextSlide">›</button>
        </div>
        <QuickBooking />
        <div class="featured-dishes">
          <h2 class="section-title">Món ăn nổi bật</h2>
          <div class="dish-grid-wrapper">
            <button class="scroll-left" @click="scrollLeft">‹</button>

            <div class="dish-grid" ref="dishGrid">
              <div
                class="dish-card"
                v-for="(dish, index) in featuredDishes"
                :key="index"
                ref="dishCards"
              >
                <img :src="dish.image_url || '/images/default.jpg'" :alt="dish.name" />
                <div class="dish-info">
                  <h3>{{ dish.name }}</h3>
                  <p class="desc">{{ dish.description }}</p>
                  <el-button
                    class="order-button"
                    type="primary"
                    @click="handleOrderClick(dish)"
                  >
                    Đặt món
                  </el-button>
                </div>
              </div>
            </div>

            <button class="scroll-right" @click="scrollRight">›</button>
          </div>
        </div>
        <section class="featured-dishes-with-sidebar" ref="allDishesSection">
          <aside class="sidebar">
            <div class="sidebar-section">
              <h3>DANH MỤC MÓN ĂN</h3>
              <ul>
                <li><a href="#">Món ăn mới</a></li>
                <li><a href="#">Món ăn được khuyến mãi</a></li>
                <li><a href="#">Món ăn nổi bật</a></li>
                <li><a href="#">Pizza</a></li>
                <li><a href="#">Bánh ngọt</a></li>
                <li><a href="#">Bánh kem</a></li>
                <li><a href="#">Đồ ăn nhẹ</a></li>
              </ul>
            </div>
          </aside>
          <div class="all-dishes">
            <h2 class="section-title">Tất cả món ăn</h2>
            <div class="dish-list">
              <div
                class="dish-card"
                v-for="(dish, index) in allMenuItems"
                :key="'all-' + index"
              >
                <img :src="dish.image_url || '/images/default.jpg'" :alt="dish.name" />
                <div class="dish-info">
                  <div class="dish-content">
                    <h3>{{ dish.name }}</h3>
                    <p class="desc">{{ dish.description }}</p>
                    <p class="dish-price">
                      <strong class="price-num"
                        >{{ parseInt(dish.price).toLocaleString("vi-VN") }} đ</strong
                      >
                    </p>
                  </div>
                  <el-button
                    class="order-button"
                    type="primary"
                    @click="handleOrderClick(dish)"
                  >
                    Đặt món
                  </el-button>
                </div>
              </div>
            </div>

            <div class="pagination">
              <button @click="prevPage" :disabled="currentPage === 1">
                ← Trang trước
              </button>
              <span>Trang {{ currentPage }} / {{ totalPages }}</span>
              <button @click="nextPage" :disabled="currentPage === totalPages">
                Trang sau →
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();
import { Search } from "@element-plus/icons-vue";
import { ShoppingCart } from "@element-plus/icons-vue";
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { SwitchButton } from "@element-plus/icons-vue";
import QuickBooking from "@/components/QuickBooking.vue";
import { ElMessage } from "element-plus";

const realImages = [
  "/images/homeimg1.png",
  "/images/homeimg2.png",
  "/images/homeimg3.png",
];

const logout = () => {
  const confirmed = window.confirm("Bạn có chắc muốn đăng xuất?");
  if (confirmed) {
    localStorage.removeItem("token");
    isLoggedIn.value = false;
    user.value = null;
    router.push("/").then(() => location.reload());
  }
};

const images = [realImages[realImages.length - 1], ...realImages, realImages[0]]; // clone cuối - thật - clone đầu
const currentIndex = ref(1);
const isTransitionEnabled = ref(true); // 🔥 thêm dòng này

let intervalId = null;

onMounted(() => {
  intervalId = setInterval(() => {
    currentIndex.value += 1;
    isTransitionEnabled.value = true;

    if (currentIndex.value >= images.length - 1) {
      setTimeout(() => {
        isTransitionEnabled.value = false;
        currentIndex.value = 1;
      }, 600); // trùng với CSS transition
    }
  }, 3000);
});

onBeforeUnmount(() => {
  clearInterval(intervalId);
});

const prevSlide = () => {
  currentIndex.value -= 1;
  isTransitionEnabled.value = true;

  if (currentIndex.value <= 0) {
    setTimeout(() => {
      isTransitionEnabled.value = false;
      currentIndex.value = images.length - 2;
    }, 600);
  }
};

const nextSlide = () => {
  currentIndex.value += 1;
  if (currentIndex.value >= images.length - 1) {
    setTimeout(() => {
      currentIndex.value = 1;
    }, 600);
  }
};
const featuredDishes = ref([]);
onMounted(async () => {
  try {
    const response = await axios.get("http://localhost:3000/api/menu-items/featured");
    featuredDishes.value = response.data;
  } catch (error) {
    console.error("Không tải được danh sách món ăn nổi bật:", error);
  }
});

const user = ref(null);
const isLoggedIn = ref(false);

onMounted(async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await axios.get("http://localhost:3000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      user.value = res.data;

      isLoggedIn.value = true;
    } catch (err) {
      console.error("Token lỗi hoặc hết hạn:", err);
    }
  }
});

const getAvatarUrl = (path) => {
  if (!path) return "/images/default-avatar.png"; // fallback ảnh mặc định
  if (path.startsWith("http")) return path;
  return `http://localhost:3000${path}`;
};

const dishGrid = ref(null);
const dishCards = ref([]);

const scrollByCard = (direction) => {
  if (!dishCards.value.length) return;
  const itemWidth = dishCards.value[0].offsetWidth + 24; // 24 = gap
  dishGrid.value.scrollBy({
    left: direction === "right" ? itemWidth : -itemWidth,
    behavior: "smooth",
  });
};

const scrollLeft = () => scrollByCard("left");
const scrollRight = () => scrollByCard("right");

const allMenuItems = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const limit = 10;

const fetchPaginatedMenu = async () => {
  try {
    const res = await axios.get(
      `http://localhost:3000/api/menu-items?page=${currentPage.value}&limit=${limit}`
    );
    allMenuItems.value = res.data.items;
    totalPages.value = res.data.totalPages;
  } catch (err) {
    console.error("Lỗi khi lấy menu phân trang:", err);
  }
};

onMounted(() => {
  fetchPaginatedMenu();
});

const allDishesSection = ref(null);
const scrollToAllDishes = () => {
  if (allDishesSection.value) {
    allDishesSection.value.scrollIntoView({ behavior: "smooth" });
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchPaginatedMenu();
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchPaginatedMenu();
  }
};

const handleOrderClick = () => {
  const reservation = JSON.parse(localStorage.getItem("reservation"));

  if (reservation && reservation.status === "confirmed") {
    router.push({
      name: "OrderMenu",
      query: { reservation_id: reservation.reservation_id },
    });
  } else {
    ElMessage.warning("Vui lòng đặt bàn trước khi gọi món.");
  }
};
</script>

<style scoped>
.home-page {
  background-color: #fffaf3;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  width: 100%;
}

.home-page_header {
  max-width: 1200px;
  margin: 0 auto;
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

.right-links {
  display: flex;
  gap: 10px;
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

.slider-carousel {
  width: 60vw;
  overflow: hidden;
  margin: 0 auto;
  position: relative;
  height: 600px; /* chỉnh theo ảnh bạn */
  max-width: 100%;
}

.slider-carousel-track {
  display: flex;
  transition: transform 0.6s ease-in-out;
}

.slider-carousel-image {
  width: 60vw;
  height: 100%;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 10px;
}

.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  background: rgba(255, 255, 255, 0.7);
  border: none;
  cursor: pointer;
  padding: 0 12px;
  z-index: 10;
  border-radius: 50%;
  transition: background 0.3s;
}

.arrow:hover {
  background: #f2b94c;
  color: white;
}

.arrow.left {
  left: 10px;
}

.arrow.right {
  right: 10px;
}

.no-transition {
  transition: none !important;
}

.nav-link {
  text-decoration: none;
  color: #333;
  font-weight: bold;
}

.nav-link:hover {
  color: #f2b94c;
}

.router-link-exact-active,
.nav-link.active {
  color: #f2b94c;
  border-bottom: 2px solid #f2b94c;
}

.featured-dishes {
  padding: 50px 20px;
  background: #fff;
  text-align: center;
  max-width: 1200px;
  width: 100%;
}

.section-title {
  font-size: 28px;
  margin-bottom: 40px;
  color: #a16500;
}

.dish-grid {
  display: flex;
  overflow-x: auto;
  gap: 24px;
  width: 100%;

  padding-bottom: 10px;
}

.dish-card {
  flex: 0 0 calc(20% - 18px);
  flex-shrink: 0;

  background: #fffaf3;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.dish-card:hover {
  transform: translateY(-4px);
}

.dish-card img {
  width: 100%;
  height: 200px; /* hoặc 180px, tùy layout */
  object-fit: cover;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.dish-info {
  padding: 16px;
}

.dish-info h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: #333;
}

.dish-info p {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.dish-info button {
  background-color: #a16500;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.dish-info button:hover {
  background-color: #804d00;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  color: #333;
}

.nav-user:hover {
  cursor: pointer;
  color: #f2b94c;
}

.username {
  font-size: 14px;
}

.nav-user-loggedin {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logout-button {
  color: black;
  font-size: 14px;
  padding: 0;
}

.logout-button:hover {
  text-decoration: underline;
  cursor: pointer;
  color: #f2b94c;
}

.featured-dishes-with-sidebar {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  gap: 40px;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
}

.sidebar-section h3 {
  background-color: #a16500;
  color: white;
  padding: 10px;
  font-size: 16px;
  margin-bottom: 10px;
}

.sidebar-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-section ul li {
  padding: 8px 0;
  border-bottom: 1px dashed #ccc;
}

.sidebar-section ul li a {
  color: #333;
  text-decoration: none;
  font-size: 14px;
}

.sidebar-section ul li a:hover {
  color: #f2b94c;
}

.router-link-exact-active.nav-link {
  color: #f2b94c;
  border-bottom: 2px solid #f2b94c;
}

.dish-grid-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.scroll-left,
.scroll-right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  font-size: 24px;
  padding: 8px 12px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.scroll-left {
  left: 0;
}
.scroll-right {
  right: 0;
}

.all-dishes {
  flex: 1;
}

.all-dishes .dish-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}

.all-dishes .dish-card {
  background: #fffaf3;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.all-dishes .dish-card:hover {
  transform: translateY(-4px);
}

.all-dishes .dish-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.all-dishes .dish-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  padding: 12px;
}

.all-dishes .dish-info h3 {
  font-size: 18px;
  margin-bottom: 6px;
  color: #333;
}

.all-dishes .dish-info p {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  align-items: center;
}

.pagination button {
  background: #a16500;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.pagination button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.desc {
  min-height: 48px; /* Hoặc tuỳ độ cao cần đồng bộ */
  overflow: hidden;
}

.order-button {
  background-color: #a16500;
  color: white;
  border: none;
  margin-top: auto;
  width: 100%;
  font-weight: bold;
}

.order-button:hover {
  background-color: #804d00;
}

.all-dishes .dish-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  padding: 12px;
}

.dish-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100px;
}

.dish-info h3 {
  font-size: 18px;
  margin-bottom: 6px;
  color: #333;
  min-height: 44px;
}

.dish-info .desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  flex-grow: 1;
}

.dish-price {
  font-weight: bold;
  color: #a16500;
  margin-top: auto;
  text-align: center;
}

.price-num {
  color: red;
}

.order-button {
  background-color: #a16500;
  color: white;
  border: none;
  margin-top: 12px;
  width: 100%;
  font-weight: bold;
  transition: background 0.3s;
}

.order-button:hover {
  background-color: #804d00;
}
</style>
