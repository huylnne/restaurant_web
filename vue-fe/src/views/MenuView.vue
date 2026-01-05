<template>
  <div class="container">
    <div class="featured-dishes-with-sidebar" ref="allDishesSection">
      <div class="menu_selection">
        <el-button
          plain
          :type="selectedCategory === '' ? 'primary' : ''"
          @click="selectCategory('')"
        >
          <span>Tất cả</span>
        </el-button>
        <el-button
          plain
          :type="selectedCategory === 'starter' ? 'primary' : ''"
          @click="selectCategory('starter')"
        >
          <el-icon><CoffeeCup /></el-icon>
          <span>Khai vị</span>
        </el-button>
        <el-button
          plain
          :type="selectedCategory === 'main' ? 'primary' : ''"
          @click="selectCategory('main')"
        >
          <el-icon><KnifeFork /></el-icon>
          <span>Món chính</span>
        </el-button>
        <el-button
          plain
          :type="selectedCategory === 'dessert' ? 'primary' : ''"
          @click="selectCategory('dessert')"
        >
          <el-icon><IceCream /></el-icon>
          <span>Tráng miệng</span>
        </el-button>
        <el-button
          plain
          :type="selectedCategory === 'drink' ? 'primary' : ''"
          @click="selectCategory('drink')"
        >
          <el-icon><GobletFull /></el-icon>
          <span>Đồ uống</span>
        </el-button>
        <button v-if="isAdmin" class="add-dish-btn" @click="openAddModal">
          + Thêm món
        </button>
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
              <!-- Chỉ hiện nút đặt món khi KHÔNG phải admin -->
              <el-button
                v-if="!isAdmin"
                class="order-button"
                type="primary"
                @click="handleOrderClick(dish)"
              >
                Đặt món
              </el-button>
              <!-- Admin: Hiện nút Sửa và Xóa -->
              <div v-if="isAdmin" class="admin-actions">
                <button class="edit-dish-btn" @click="openEditModal(dish)">Sửa</button>
                <button class="delete-dish-btn" @click="confirmDelete(dish)">Xóa</button>
              </div>
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

    <!-- Modal CRUD -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>
            {{ modalMode === "add" ? "Thêm món mới" : "Chỉnh sửa món ăn" }}
          </h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="handleSubmit" class="modal-form">
          <div class="form-group">
            <label>Tên món <span class="required">*</span></label>
            <input
              v-model="formState.name"
              type="text"
              placeholder="Nhập tên món"
              required
            />
          </div>
          <div class="form-group">
            <label>Mô tả</label>
            <textarea
              v-model="formState.description"
              rows="3"
              placeholder="Nhập mô tả món ăn"
            ></textarea>
          </div>
          <div class="form-group">
            <label>Giá <span class="required">*</span></label>
            <input
              v-model.number="formState.price"
              type="number"
              min="0"
              placeholder="Nhập giá"
              required
            />
          </div>
          <div class="form-group">
            <label>Danh mục <span class="required">*</span></label>
            <select v-model="formState.category" required>
              <option value="starter">Khai vị</option>
              <option value="main">Món chính</option>
              <option value="dessert">Tráng miệng</option>
              <option value="drink">Đồ uống</option>
            </select>
          </div>
          <div class="form-group">
            <label>URL Hình ảnh</label>
            <input
              v-model="formState.image_url"
              type="text"
              placeholder="Nhập URL hình ảnh"
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">Hủy</button>
            <button type="submit" class="btn-submit" :disabled="submitting">
              {{
                submitting ? "Đang xử lý..." : modalMode === "add" ? "Thêm" : "Cập nhật"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import axios from "axios";

// Quản lý quyền admin
const isAdmin = ref(false);

// Thêm biến filter
const selectedCategory = ref("");
const allMenuItems = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const limit = 8;

// Modal state
const showModal = ref(false);
const modalMode = ref("add");
const submitting = ref(false);

const formState = reactive({
  id: null,
  name: "",
  description: "",
  price: 0,
  category: "main",
  image_url: "",
  branch_id: 1,
});

onMounted(() => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  isAdmin.value = !!token && user && user.role === "admin";
  fetchPaginatedMenu();
});

const fetchPaginatedMenu = async () => {
  try {
    let url = `http://localhost:3000/api/menu-items?page=${currentPage.value}&limit=${limit}`;
    if (selectedCategory.value) {
      url += `&category=${selectedCategory.value}`;
    }
    const res = await axios.get(url);
    allMenuItems.value = res.data.items;
    totalPages.value = res.data.totalPages;
  } catch (err) {
    console.error("Lỗi khi lấy menu phân trang:", err);
  }
};

const selectCategory = (category) => {
  selectedCategory.value = category;
  currentPage.value = 1;
  fetchPaginatedMenu();
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

const handleOrderClick = (dish) => {
  alert(`Bạn đã chọn món: ${dish.name}`);
};

const openAddModal = () => {
  modalMode.value = "add";
  Object.assign(formState, {
    id: null,
    name: "",
    description: "",
    price: 0,
    category: "main",
    image_url: "",
    branch_id: 1,
  });
  showModal.value = true;
};

const openEditModal = (dish) => {
  modalMode.value = "edit";
  Object.assign(formState, {
    id: dish.item_id || dish.id,
    name: dish.name,
    description: dish.description,
    price: dish.price,
    category: dish.category,
    image_url: dish.image_url,
    branch_id: dish.branch_id || 1,
  });
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const confirmDelete = async (dish) => {
  const dishId = dish.item_id || dish.id;
  const confirmed = confirm(`Bạn có chắc muốn xóa món "${dish.name}"?`);
  if (!confirmed) return;
  try {
    const token = localStorage.getItem("token");
    await axios.delete(`http://localhost:3000/api/admin/menu/${dishId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    alert("Xóa món ăn thành công!");
    fetchPaginatedMenu();
  } catch (error) {
    alert(`Có lỗi xảy ra: ${error.response?.data?.message || error.message}`);
  }
};

const handleSubmit = async () => {
  try {
    submitting.value = true;
    const token = localStorage.getItem("token");
    const payload = {
      name: formState.name,
      description: formState.description,
      price: formState.price,
      category: formState.category,
      image_url: formState.image_url,
      branch_id: formState.branch_id,
    };
    if (modalMode.value === "edit") {
      await axios.put(`http://localhost:3000/api/admin/menu/${formState.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Cập nhật món ăn thành công!");
    } else {
      await axios.post(`http://localhost:3000/api/admin/menu`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Thêm món ăn thành công!");
    }
    showModal.value = false;
    fetchPaginatedMenu();
  } catch (error) {
    alert(`Có lỗi xảy ra: ${error.response?.data?.message || error.message}`);
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background-color: #f0e9dc;
  padding: 20px;
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
  width: 100%;
  background-color: white;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
  display: flex;
  border-radius: 8px;
  position: relative;
  padding: 0 16px;
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

.add-dish-btn {
  margin-left: auto;
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s ease;
}

.add-dish-btn:hover {
  background-color: #218838;
}

.all-dishes {
  flex: 1;
  width: 100%;
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

/* Admin actions */
.admin-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.edit-dish-btn,
.delete-dish-btn {
  flex: 1;
  padding: 10px;
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.edit-dish-btn {
  background-color: #007bff;
}

.edit-dish-btn:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

.delete-dish-btn {
  background-color: #dc3545;
}

.delete-dish-btn:hover {
  background-color: #c82333;
  transform: translateY(-2px);
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

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #333;
}

.modal-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.required {
  color: red;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #a16500;
  box-shadow: 0 0 0 2px rgba(161, 101, 0, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel,
.btn-submit {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
}

.btn-submit {
  background-color: #a16500;
  color: white;
}

.btn-submit:hover {
  background-color: #e46d00;
  transform: translateY(-2px);
}

.btn-submit:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 992px) {
  .featured-dishes-with-sidebar {
    flex-direction: column;
  }

  .dish-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .menu_selection {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .dish-list {
    grid-template-columns: 1fr;
  }

  .menu_selection button {
    width: auto;
    padding: 8px;
  }

  .menu_selection button span {
    font-size: 14px;
  }

  .add-dish-btn {
    padding: 8px 12px;
    font-size: 14px;
  }

  .modal-content {
    width: 95%;
  }
}
</style>
