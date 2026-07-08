<template>
  <div class="home-page">
    <div class="home-page_body">
      <div class="container">
        <div class="slider">
          <div class="slider-carousel">
            <div
              class="slider-carousel-track"
              :class="{ 'no-transition': !isTransitionEnabled }"
              :style="{ transform: `translateX(calc(-${currentIndex} * var(--slide-width)))` }"
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
            <span>{{ BRAND.name }}</span>
            <h2>Trải nghiệm ẩm thực Việt đặc sắc trong không gian ấm cúng</h2>
            <div class="overlay_btn">
              <router-link to="/branches/nearby">
                <el-button type="primary">
                  <el-icon class="btn-icon-inline"><Location /></el-icon>
                  Chi nhánh gần bạn
                </el-button>
              </router-link>
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
          <div class="hl-section-header">
            <h2 class="section-title section-title--decorated">Món ăn nổi bật</h2>
          </div>
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

        <HomeNearbySection />
      </div>
    </div>
  </div>
</template>

<script setup>
// UserDashboardPage — trang chủ khách: carousel banner, món nổi bật cuộn ngang, khối chi nhánh gần bạn.
import HomeNearbySection from "@/components/HomeNearbySection.vue";
import { BRAND } from "@/config/siteContent";
import { Location } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
const router = useRouter();
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";

// --- Carousel banner (vòng lặp vô hạn) ---
const realImages = [
  "/images/homeimg1.png",
  "/images/homeimg2.png",
  "/images/homeimg3.png",
];

// Thêm ảnh "clone" ở đầu/cuối để khi trượt tới biên có thể nhảy về slide thật mà không thấy giật.
const images = [realImages[realImages.length - 1], ...realImages, realImages[0]];
const currentIndex = ref(1);           // bắt đầu ở slide thật đầu tiên (index 1, vì 0 là clone)
const isTransitionEnabled = ref(true); // tắt transition khi "nhảy" về slide thật ở biên

let intervalId = null;

// Tự động chuyển slide mỗi 3 giây.
onMounted(() => {
  intervalId = setInterval(() => {
    currentIndex.value += 1;
    isTransitionEnabled.value = true;

    // Tới clone cuối → sau khi animation xong, tắt transition và nhảy về slide thật đầu.
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

// Nút slide trước: nếu về clone đầu thì nhảy về slide thật cuối.
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

// Nút slide sau: tới clone cuối thì nhảy về slide thật đầu.
const nextSlide = () => {
  currentIndex.value += 1;
  if (currentIndex.value >= images.length - 1) {
    setTimeout(() => {
      currentIndex.value = 1;
    }, 600);
  }
};

// --- Món nổi bật ---
const featuredDishes = ref([]);
onMounted(async () => {
  try {
    const response = await axios.get("/api/menu-items/featured");
    featuredDishes.value = response.data;
  } catch (error) {
    console.error("Không tải được danh sách món ăn nổi bật:", error);
  }
});

const dishGrid = ref(null);
const dishCards = ref([]);

// Cuộn lưới món theo đúng 1 thẻ (bề rộng thẻ + gap 24px).
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

// Chỉ đơn pending/confirmed mới cho phép đặt món trước.
const canPreOrderForReservation = (order) =>
  ["pending", "confirmed"].includes(String(order?.status || "").toLowerCase());

// Bấm "Đặt món": nếu đã có đơn đặt bàn hợp lệ → chuyển sang trang OrderMenu; không thì nhắc đặt bàn trước.
const handleOrderClick = (dish) => {
  const order = JSON.parse(localStorage.getItem("activeOrder") || "null");

  if (order && canPreOrderForReservation(order)) {
    if (dish?.item_id) {
      sessionStorage.setItem(
        "pendingOrderDish",
        JSON.stringify({ item_id: dish.item_id, name: dish.name, ...dish })
      );
    }
    router.push({
      name: "OrderMenu",
      query: {
        order_id: order.order_id,
        branch_id: order.branch_id,
      },
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

.home-page_body {
  background-color: var(--hl-bg-section);
  background-image:
    radial-gradient(ellipse at 15% 0%, rgba(161, 101, 0, 0.07) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 100%, rgba(46, 74, 61, 0.06) 0%, transparent 55%);
  min-height: 100vh;
}

.slider {
  position: relative;
}

.slider-carousel {
  --slide-width: min(72vw, 1100px);
  width: var(--slide-width);
  overflow: hidden;
  margin: var(--hl-space-xl) auto 0;
  position: relative;
  height: 520px;
  max-width: 100%;
  border-radius: var(--hl-radius-xl);
  box-shadow: var(--hl-shadow-lg);
}

.slider-carousel::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.15) 50%, transparent 100%);
  z-index: 1;
  border-radius: var(--hl-radius-xl);
  pointer-events: none;
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
  font-family: var(--hl-font-display);
  font-size: clamp(2rem, 5vw, 3rem);
  justify-content: center;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.35);
}

.slider_overlay h2 {
  color: rgba(255, 255, 255, 0.95);
  font-size: clamp(1rem, 2.5vw, 1.35rem);
  font-weight: 400;
  text-align: center;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
  max-width: 640px;
}

.slider_overlay span {
  font-family: var(--hl-font-display);
  font-size: clamp(2rem, 5vw, 3rem);
  color: var(--hl-primary-light);
  font-weight: 700;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.overlay_btn {
  gap: 12px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.overlay_btn .btn-icon-inline {
  margin-right: 4px;
}

.slider-carousel-track {
  display: flex;
  transition: transform 0.6s ease-in-out;
}

.slider-carousel-image {
  width: var(--slide-width);
  height: 100%;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--hl-radius-xl);
}

.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
  z-index: 10;
  border-radius: 50%;
  transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  color: var(--hl-text);
  box-shadow: var(--hl-shadow-sm);
}

.arrow:hover {
  background: var(--hl-primary);
  color: white;
  transform: translateY(-50%) scale(1.05);
  box-shadow: var(--hl-shadow-md);
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
  box-sizing: border-box;
}

.dish-grid::-webkit-scrollbar {
  display: none;
}

.section-title {
  font-family: var(--hl-font-display);
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  margin-bottom: 0;
  color: var(--hl-secondary);
  font-weight: 700;
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
  background: var(--hl-bg-card);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--hl-border-light);
}

.dish-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--hl-shadow-lg);
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
  font-size: 1.1rem;
  margin-bottom: 8px;
  color: var(--hl-secondary);
  font-weight: 700;
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
  width: 100%;
  max-width: 100%;
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
  background: var(--hl-gradient-primary) !important;
  color: white;
  border: none;
  margin-top: auto;
  width: 100%;
  font-weight: 600;
  border-radius: var(--hl-radius-md);
  padding: var(--hl-space-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 8px rgba(161, 101, 0, 0.2);
}

.order-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(161, 101, 0, 0.3);
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

@media (max-width: 992px) {
  .slider-carousel {
    --slide-width: min(90vw, 100%);
    height: 460px;
  }

  .slider_overlay {
    width: min(90%, 640px);
  }

  .slider_overlay h1,
  .slider_overlay span {
    font-size: clamp(2rem, 7vw, 3rem);
  }

  .slider_overlay h2 {
    font-size: clamp(1.1rem, 4vw, 1.6rem);
  }

  .featured-dishes {
    padding: var(--hl-space-xl) var(--hl-space-md);
  }

  .dish-grid-wrapper {
    overflow: visible;
  }

  .dish-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    margin: 0;
    gap: var(--hl-space-md);
    overflow: visible;
    padding: 0 0 var(--hl-space-sm);
  }

  .dish-card {
    max-width: none;
    min-width: 0;
  }

  .scroll-left,
  .scroll-right {
    display: none;
  }
}

@media (max-width: 640px) {
  .slider-carousel {
    --slide-width: 100%;
    width: 100%;
    height: 360px;
  }

  .slider-carousel-image {
    border-radius: 0;
  }

  .slider_overlay {
    width: calc(100% - 32px);
  }

  .overlay_btn {
    align-items: stretch;
    flex-direction: column;
  }

  .overlay_btn a,
  .overlay_btn .el-button {
    width: 100%;
  }

  .dish-card {
    min-width: 0;
  }

  .dish-card img {
    height: 180px;
  }

  .dish-grid {
    grid-template-columns: minmax(0, 1fr);
  }

}
</style>
