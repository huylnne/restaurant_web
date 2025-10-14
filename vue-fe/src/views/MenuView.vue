<template>
  <div class="container">
    <Header />
    <div class="featured-dishes-with-sidebar" ref="allDishesSection">
      <div class="menu_selection">
        <el-button plain><span>Tất cả</span></el-button>
        <el-button plain>
          <el-icon><CoffeeCup /></el-icon>
          <span>Khai vị</span>
        </el-button>
        <el-button plain>
          <el-icon><KnifeFork /></el-icon>
          <span>Món chính</span>
        </el-button>
        <el-button plain>
          <el-icon><IceCream /></el-icon>
          <span>Tráng miệng</span>
        </el-button>
        <el-button plain>
          <el-icon><GobletFull /></el-icon>
          <span>Đồ uống</span>
        </el-button>
      </div>
      <div class="all-dishes">
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
                  <strong class="price-num">
                    {{ parseInt(dish.price).toLocaleString("vi-VN") }} đ
                  </strong>
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
          <button @click="prevPage" :disabled="currentPage === 1">← Trang trước</button>
          <span>Trang {{ currentPage }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">
            Trang sau →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import Header from "../components/UserNavbar.vue";
const allMenuItems = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const limit = 8;

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
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f0e9dc;
}

.featured-dishes-with-sidebar {
  display: flex;
  width: 100%;
  max-width: 1300px;
  margin: 0 auto;
  padding: 40px 20px;
  gap: 40px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.menu_selection {
  height: 80px;
  width: 70%;
  background-color: white;
  align-items: center;
  justify-content: center;
  text-align: center;
  display: flex;
  border-radius: 5px solid #ccc;
}

.menu_selection button {
  width: 20%;
  margin: 0;
  height: 100%;
}

.menu_selection button span {
  font-size: 24px;
}

.el-icon {
  font-size: 24px;
}

.all-dishes {
  flex: 1;
}

.dish-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.dish-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.dish-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}

.dish-card img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.dish-info {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.dish-content h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.dish-content .desc {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 10px;
  height: 42px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dish-price {
  font-size: 18px;
  font-weight: bold;
  color: #a16500;
  margin-top: 10px;
}

.price-num {
  color: #a16500;
}

.order-button {
  margin-top: 12px;
  padding: 10px;
  background-color: #a16500;
  border: none;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  transition: background 0.3s ease;
  cursor: pointer;
}

.order-button:hover {
  background-color: #e46d00;
}

.pagination {
  margin-top: 30px;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.pagination button {
  background: #a16500;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s ease;
}

.pagination button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background: #e46d00;
}

.pagination span {
  font-size: 16px;
  color: #333;
  line-height: 40px;
}

@media (max-width: 992px) {
  .featured-dishes-with-sidebar {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .dish-list {
    grid-template-columns: 1fr;
  }
}
</style>
