<template>
  <div class="home-page">
    <div class="home-page_body">
      <div class="container">
        <div class="slider">
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

            <button class="arrow left" @click="prevSlide">‹</button>

            <button class="arrow right" @click="nextSlide">›</button>
          </div>
          <div class="slider_overlay">
            <h1>Chào mừng đến với</h1>
            <span>HL Food</span>
            <h2>Trải nghiệm ẩm thực Việt đặc sắc trong không gian ấm cúng</h2>
            <div class="overlay_btn">
              <router-link to="./booking">
                <el-button type="warning">Đặt bàn ngay</el-button>
              </router-link>
              <router-link to="./menu">
                <el-button>Xem thực đơn</el-button>
              </router-link>
            </div>
          </div>
        </div>
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
import { ElMessage, ElMessageBox } from "element-plus";

const realImages = [
  "/images/homeimg1.png",
  "/images/homeimg2.png",
  "/images/homeimg3.png",
];

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

const images = [realImages[realImages.length - 1], ...realImages, realImages[0]];
const currentIndex = ref(1);
const isTransitionEnabled = ref(true);

let intervalId = null;

onMounted(() => {
  intervalId = setInterval(() => {
    currentIndex.value += 1;
    isTransitionEnabled.value = true;

    if (currentIndex.value >= images.length - 1) {
      setTimeout(() => {
        isTransitionEnabled.value = false;
        currentIndex.value = 1;
      }, 600);
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

const DEFAULT_AVATAR = "https://maunhi.com/wp-content/uploads/2025/04/avatar-facebook-mac-dinh-3.jpeg";

const getAvatarUrl = (path) => {
  if (!path || (typeof path === "string" && !path.trim())) return DEFAULT_AVATAR;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return `http://localhost:3000${path}`;
  return path;
};

const dishGrid = ref(null);
const dishCards = ref([]);

const scrollByCard = (direction) => {
  if (!dishCards.value.length) return;
  const itemWidth = dishCards.value[0].offsetWidth + 24;
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
.el-button {
  width: 150px;
  height: 40px;
}

.home-page {
  background-color: var(--hl-bg-page);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.container {
  max-width: var(--hl-content-max);
  margin: 0 auto;
  padding: 0;
  width: 100%;
}

.home-page_header {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
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
  height: 80px;
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
  color: var(--hl-text);
  cursor: pointer;
}

.nav-menu a:hover {
  cursor: pointer;
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
  padding: 10px;
  flex-direction: column;
  gap: 5px;
  z-index: 100;
  border-radius: var(--hl-radius-md);
  box-shadow: var(--hl-shadow-md);
}

.nav-menu .dropdown > span:hover {
  color: var(--hl-primary);
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
  font-size: 22px;
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
  background-color: var(--hl-bg-section);
  min-height: 100vh;
}

.slider {
  position: relative;
}

.slider-carousel {
  width: 60vw;
  overflow: hidden;
  margin: 0 auto;
  position: relative;
  height: 600px;
  max-width: 100%;
}

.slider-carousel::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1;
}

.slider_overlay {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
  left: 50%;
  top: 50%;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
}

.slider_overlay h1 {
  color: #ffffff;
  font-size: 50px;
  justify-content: center;
}

.slider_overlay h2 {
  color: #ffffff;
  font-size: 30px;
  font-weight: 100;
  text-align: center;
}

.slider_overlay span {
  font-size: 50px;
  color: var(--hl-primary-light);
  font-weight: bold;
}

.overlay_btn {
  gap: 20px;
  width: 100%;
  display: flex;
  justify-content: center;
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
  background: rgba(255, 255, 255, 0.85);
  border: none;
  cursor: pointer;
  padding: 0 12px;
  z-index: 10;
  border-radius: 50%;
  transition: background 0.2s ease;
  color: var(--hl-text);
}

.arrow:hover {
  background: var(--hl-primary);
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

.featured-dishes {
  padding: 50px 20px;
  text-align: center;
  max-width: 1200px;
  width: 100%;
}

.dish-grid::-webkit-scrollbar {
  display: none;
}

.section-title {
  font-size: 28px;
  margin-bottom: 40px;
  color: var(--hl-primary);
  font-weight: 600;
}

.dish-grid {
  display: flex;
  overflow-x: scroll;
  gap: 24px;
  width: 100%;
  padding-bottom: 10px;
  margin: 0 35px;
}

.dish-card {
  flex: 0 0 calc(20% - 18px);
  flex-shrink: 0;
  background: var(--hl-bg-page);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  overflow: hidden;
  transition: transform 0.2s ease;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--hl-border-light);
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
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.dish-info h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: var(--hl-text);
}

.dish-info p {
  font-size: 14px;
  color: var(--hl-text-muted);
  margin-bottom: 0;
}

.dish-info button {
  background-color: var(--hl-primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: var(--hl-radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.dish-info button:hover {
  background-color: var(--hl-primary-hover);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
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
  gap: 12px;
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
  background-color: var(--hl-primary);
  color: white;
  padding: var(--hl-space-sm);
  font-size: 16px;
  margin-bottom: var(--hl-space-sm);
  border-radius: var(--hl-radius-sm);
}

.sidebar-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-section ul li {
  padding: var(--hl-space-sm) 0;
  border-bottom: 1px dashed var(--hl-border);
}

.sidebar-section ul li a {
  color: var(--hl-text);
  text-decoration: none;
  font-size: 14px;
}

.sidebar-section ul li a:hover {
  color: var(--hl-primary);
}

.router-link-exact-active.nav-link {
  color: var(--hl-primary);
  border-bottom: 2px solid var(--hl-primary);
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
  background: var(--hl-bg-card);
  border: 1px solid var(--hl-border-light);
  font-size: 24px;
  padding: 8px 12px;
  cursor: pointer;
  box-shadow: var(--hl-shadow-sm);
  border-radius: var(--hl-radius-sm);
  color: var(--hl-text);
}

.scroll-left:hover,
.scroll-right:hover {
  background: var(--hl-primary);
  color: white;
  border-color: var(--hl-primary);
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
  background: var(--hl-bg-page);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  border: 1px solid var(--hl-border-light);
  overflow: hidden;
  transition: transform 0.2s ease;
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
  color: var(--hl-text);
  min-height: 44px;
}

.all-dishes .dish-info p,
.all-dishes .dish-info .desc {
  font-size: 14px;
  color: var(--hl-text-muted);
  margin-bottom: 8px;
  flex-grow: 1;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: var(--hl-space-md);
  margin-top: var(--hl-space-lg);
  align-items: center;
}

.pagination button {
  background: var(--hl-primary);
  color: white;
  border: none;
  padding: var(--hl-space-xs) var(--hl-space-md);
  border-radius: var(--hl-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.pagination button:disabled {
  background: var(--hl-border);
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background: var(--hl-primary-hover);
}
.all-dishes .desc {
  overflow: hidden;
}

.order-button {
  background-color: var(--hl-primary);
  color: white;
  border: none;
  margin-top: auto;
  width: 100%;
  font-weight: 600;
  border-radius: var(--hl-radius-md);
  padding: var(--hl-space-sm);
  transition: background 0.2s ease;
}

.order-button:hover {
  background-color: var(--hl-primary-hover);
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

.dish-price {
  font-weight: bold;
  color: var(--hl-primary);
  margin-top: auto;
  text-align: center;
}

.price-num {
  color: var(--hl-success);
  font-weight: 600;
  font-size: 24px;
}
</style>
