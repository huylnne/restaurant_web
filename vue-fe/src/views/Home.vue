<template>
  <div class="home-page">
    <div class="home-page_body">
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
      <div class="featured-dishes">
        <h2 class="section-title">Món ăn nổi bật</h2>
        <span class="section-title_desc"
          >Khám phá những món ăn đặc sắc nhất của chúng tôi,được chế biến từ những nguyên
          liệu tươi ngon nhất</span
        >
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
                <button>Đặt món</button>
              </div>
            </div>
          </div>

          <button class="scroll-right" @click="scrollRight">›</button>
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

const realImages = [
  "/images/homeimg1.png",
  "/images/homeimg2.png",
  "/images/homeimg3.png",
];

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
    console.log("Dữ liệu món ăn:", featuredDishes.value);
  } catch (error) {
    console.error("Không tải được danh sách món ăn nổi bật:", error);
  }
});

import { nextTick } from "vue"; // đảm bảo đã import

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
</script>

<style scoped>
.home-page {
  background-color: var(--hl-bg-page);
  display: flex;
  flex-direction: column;
  justify-content: center;
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
  background-color: var(--hl-bg-section);
  min-height: 100vh;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.slider-carousel {
  width: 60vw;
  overflow: hidden;
  margin: 0 auto;
  position: relative;
  height: 600px; /* chỉnh theo ảnh bạn */
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
  color: #333;
  font-weight: bold;
}

.nav-link:hover {
  color: #f2b94c;
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
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.section-title {
  font-size: 28px;
  color: var(--hl-secondary);
  margin: 0;
}

.section-title_desc {
  font-size: 20px;
}

.dish-grid {
  display: flex;
  overflow-x: auto;
  gap: 24px;
  width: 100%;
  scroll-behavior: smooth;
  padding-bottom: 10px;
  max-width: 1200px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.dish-grid::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.dish-grid-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  justify-content: center;
}

.scroll-left,
.scroll-right {
  position: absolute;
  top: 30%;
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
}

.dish-info h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: var(--hl-text);
}

.dish-info p {
  font-size: 14px;
  color: var(--hl-text-muted);
  margin-bottom: 16px;
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

.desc {
  min-height: 48px; /* Hoặc tuỳ độ cao cần đồng bộ */
  overflow: hidden;
}
</style>
