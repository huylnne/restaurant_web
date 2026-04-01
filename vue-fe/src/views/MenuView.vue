<template>
  <div class="menu-page" :class="{ 'menu-page--admin': isAdminView }">
    <!-- Header khi vào từ admin (admin + waiter) -->
    <div v-if="isAdminView" class="page-header">
      <div class="page-header__text">
        <h1 class="page-header__title">Quản lý món ăn</h1>
        <p class="page-header__desc">
          {{ canManage ? 'Xem, thêm, sửa và xóa món trong thực đơn' : 'Xem danh sách món ăn' }}
        </p>
      </div>
      <!-- Chỉ admin mới thêm món -->
      <button v-if="canManage" class="add-dish-btn" @click="openAddModal">
        <el-icon><Plus /></el-icon>
        Thêm món
      </button>
    </div>

    <div class="menu-content" ref="allDishesSection">
      <!-- Thanh lọc danh mục -->
      <div class="filter-bar">
        <button
          v-for="cat in categoryOptions"
          :key="cat.value"
          type="button"
          class="filter-bar__btn"
          :class="{ 'filter-bar__btn--active': selectedCategory === cat.value }"
          @click="selectCategory(cat.value)"
        >
          <el-icon v-if="cat.icon"><component :is="cat.icon" /></el-icon>
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <div class="all-dishes">
        <div class="dish-list">
          <div
            class="dish-card"
            v-for="(dish, index) in filteredMenuItems"
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
              <!-- Hiện nút đặt món khi KHÔNG phải admin view (trang công khai) -->
              <el-button
                v-if="!isAdminView"
                class="order-button"
                type="primary"
                @click="handleOrderClick(dish)"
              >
                Đặt món
              </el-button>
              <!-- Admin: Sửa / Xóa -->
              <div v-if="isAdmin" class="admin-actions">
                <button type="button" class="admin-actions__btn admin-actions__btn--edit" @click="openEditModal(dish)">
                  <el-icon><Edit /></el-icon>
                  Sửa
                </button>
                <button type="button" class="admin-actions__btn admin-actions__btn--delete" @click="confirmDelete(dish)">
                  <el-icon><Delete /></el-icon>
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>

        <PaginationBar
          :current-page="currentPage"
          :total-pages="Math.max(1, totalPages)"
          :show-when-single-page="true"
          @update:current-page="(p) => (currentPage = p)"
        />
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
              <option value="Khai vị">Khai vị</option>
              <option value="Món chính">Món chính</option>
              <option value="Tráng miệng">Tráng miệng</option>
              <option value="Đồ uống">Đồ uống</option>
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
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { CoffeeCup, KnifeFork, IceCream, GobletFull, Plus, Edit, Delete } from "@element-plus/icons-vue";
import PaginationBar from "@/components/PaginationBar.vue";

const router = useRouter();
const route  = useRoute();

const categoryOptions = [
  { value: "", label: "Tất cả", icon: null },
  { value: "Khai vị", label: "Khai vị", icon: CoffeeCup },
  { value: "Món chính", label: "Món chính", icon: KnifeFork },
  { value: "Tráng miệng", label: "Tráng miệng", icon: IceCream },
  { value: "Đồ uống", label: "Đồ uống", icon: GobletFull },
];

// isAdminView: true khi vào qua /admin/menu (admin + waiter) → hiển thị giao diện quản lý
// canManage  : chỉ admin → được Thêm / Sửa / Xóa món
const isAdminView = ref(false);
const canManage   = ref(false);

// giữ alias để không phá các v-if dùng isAdmin bên dưới
const isAdmin = canManage;

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
  category: "Món chính",
  image_url: "",
  branch_id: 1,
});

onMounted(() => {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const role  = user?.role;
  const onAdminRoute = route.path.startsWith("/admin");

  isAdminView.value = !!token && onAdminRoute && ["admin", "waiter"].includes(role);
  canManage.value   = !!token && onAdminRoute && role === "admin";
  fetchAllMenuItems();
});

// Lấy toàn bộ menu từ API
const fetchAllMenuItems = async () => {
  try {
    const res = await axios.get("http://localhost:3000/api/menu-items?limit=1000");
    allMenuItems.value = res.data.items || [];
  } catch (err) {
    console.error("Lỗi khi lấy menu:", err);
  }
};

// Filter items theo category (client-side)
const filteredMenuItems = computed(() => {
  let items = allMenuItems.value;

  // Lọc theo category
  if (selectedCategory.value) {
    items = items.filter((item) => item.category === selectedCategory.value);
  }

  // Tính tổng số trang
  totalPages.value = Math.ceil(items.length / limit);

  // Phân trang
  const start = (currentPage.value - 1) * limit;
  const end = start + limit;
  return items.slice(start, end);
});

const selectCategory = (category) => {
  selectedCategory.value = category;
  currentPage.value = 1; // Reset về trang 1
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const handleOrderClick = () => {
  const reservation = JSON.parse(localStorage.getItem("reservation") || "null");
  if (reservation && reservation.status === "confirmed") {
    router.push({
      name: "OrderMenu",
      query: { reservation_id: reservation.reservation_id },
    });
  } else {
    ElMessage.warning("Vui lòng đặt bàn trước khi gọi món.");
  }
};

const openAddModal = () => {
  modalMode.value = "add";
  Object.assign(formState, {
    id: null,
    name: "",
    description: "",
    price: 0,
    category: "Món chính",
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
  try {
    await ElMessageBox.confirm(`Bạn có chắc muốn xóa món "${dish.name}"?`, "Xác nhận xóa", {
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      type: "warning",
    });
  } catch {
    return;
  }
  try {
    const token = localStorage.getItem("token");
    await axios.delete(`http://localhost:3000/api/admin/menu/${dishId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    ElMessage.success("Xóa món ăn thành công!");
    fetchAllMenuItems();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || "Có lỗi xảy ra");
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
      ElMessage.success("Cập nhật món ăn thành công!");
    } else {
      await axios.post(`http://localhost:3000/api/admin/menu`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      ElMessage.success("Thêm món ăn thành công!");
    }
    showModal.value = false;
    fetchAllMenuItems();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || "Có lỗi xảy ra");
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.menu-page {
  min-height: 100%;
  padding: var(--hl-space-lg);
  background: var(--hl-bg-section);
}

.menu-page--admin {
  background: var(--hl-admin-bg);
  padding: var(--hl-space-lg);
}

/* ----- Header (chỉ admin) ----- */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hl-space-xl);
  flex-wrap: wrap;
  gap: var(--hl-space-md);
}

.page-header__title {
  margin: 0 0 var(--hl-space-xs);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--hl-primary);
}

.page-header__desc {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--hl-text-muted);
}

.add-dish-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--hl-space-sm);
  padding: var(--hl-space-sm) var(--hl-space-lg);
  background: var(--hl-primary);
  color: #fff;
  border: none;
  border-radius: var(--hl-radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  box-shadow: var(--hl-shadow-sm);
}

.add-dish-btn:hover {
  background: var(--hl-primary-hover);
  transform: translateY(-1px);
}

.add-dish-btn .el-icon {
  font-size: 1.125rem;
}

/* ----- Thanh lọc danh mục ----- */
.menu-content {
  max-width: 1280px;
  margin: 0 auto;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hl-space-sm);
  margin-bottom: var(--hl-space-xl);
  padding: var(--hl-space-sm);
  background: var(--hl-bg-card);
  border-radius: var(--hl-radius-lg);
  border: 1px solid var(--hl-border-light);
  box-shadow: var(--hl-shadow-sm);
}

.menu-page--admin .filter-bar {
  background: var(--hl-admin-card);
  border-color: var(--hl-admin-border);
}

.filter-bar__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--hl-space-xs);
  padding: var(--hl-space-sm) var(--hl-space-md);
  border: 1px solid var(--hl-border);
  border-radius: var(--hl-radius-md);
  background: transparent;
  color: var(--hl-text-secondary);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-bar__btn .el-icon {
  font-size: 1.125rem;
}

.filter-bar__btn:hover {
  border-color: var(--hl-primary);
  color: var(--hl-primary);
  background: var(--hl-primary-bg);
}

.filter-bar__btn--active {
  border-color: var(--hl-primary);
  background: var(--hl-primary);
  color: #fff;
}

.filter-bar__btn--active:hover {
  background: var(--hl-primary-hover);
  border-color: var(--hl-primary-hover);
  color: #fff;
}

.all-dishes {
  width: 100%;
}

.dish-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--hl-space-lg);
}

.dish-card {
  background: var(--hl-bg-card);
  border-radius: var(--hl-radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid var(--hl-border-light);
  box-shadow: var(--hl-shadow-sm);
}

.menu-page--admin .dish-card {
  background: var(--hl-admin-card);
  border-color: var(--hl-admin-border);
}

.dish-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--hl-shadow-lg);
}

.dish-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  background: var(--hl-bg-muted);
}

.dish-info {
  padding: var(--hl-space-md);
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-md);
  min-height: 0;
}

.dish-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dish-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--hl-space-xs);
  color: var(--hl-text);
  line-height: 1.3;
}

.dish-content .desc {
  font-size: 0.875rem;
  color: var(--hl-text-muted);
  line-height: 1.45;
  margin: 0;
  height: 2.9em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.dish-price {
  font-size: 1rem;
  font-weight: 600;
  color: var(--hl-primary);
  margin-top: var(--hl-space-sm);
}

.price-num {
  color: var(--hl-primary);
}

.order-button {
  margin-top: auto;
  width: 100%;
  padding: var(--hl-space-sm) var(--hl-space-md);
  background: var(--hl-primary);
  border: none;
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: var(--hl-radius-md);
  cursor: pointer;
  transition: background 0.2s ease;
}

.order-button:hover {
  background: var(--hl-primary-hover);
}

/* Admin: Sửa / Xóa */
.admin-actions {
  display: flex;
  gap: var(--hl-space-sm);
  margin-top: auto;
}

.admin-actions__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--hl-space-xs);
  padding: var(--hl-space-sm) var(--hl-space-md);
  border: none;
  border-radius: var(--hl-radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}

.admin-actions__btn .el-icon {
  font-size: 1rem;
}

.admin-actions__btn--edit {
  background: var(--hl-admin-info);
  color: #fff;
}

.admin-actions__btn--edit:hover {
  background: #1a4d75;
  transform: translateY(-1px);
}

.admin-actions__btn--delete {
  background: var(--hl-error);
  color: #fff;
}

.admin-actions__btn--delete:hover {
  background: #9b2c2c;
  transform: translateY(-1px);
}

/* ----- Modal Thêm/Sửa món ----- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--hl-space-lg);
  animation: modalFadeIn 0.2s ease;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--hl-bg-card);
  border-radius: var(--hl-radius-xl);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--hl-shadow-lg);
  border: 1px solid var(--hl-border-light);
  animation: modalSlideUp 0.25s ease;
}

@keyframes modalSlideUp {
  from {
    transform: translateY(20px);
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
  padding: var(--hl-space-lg) var(--hl-space-xl);
  border-bottom: 1px solid var(--hl-border-light);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--hl-primary);
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--hl-text-light);
  cursor: pointer;
  border-radius: var(--hl-radius-sm);
  transition: color 0.2s ease, background 0.2s ease;
}

.close-btn:hover {
  color: var(--hl-text);
  background: var(--hl-bg-muted);
}

.modal-form {
  padding: var(--hl-space-xl);
}

.form-group {
  margin-bottom: var(--hl-space-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--hl-space-xs);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--hl-text);
}

.required {
  color: var(--hl-error);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: var(--hl-space-sm) var(--hl-space-md);
  border: 1px solid var(--hl-border);
  border-radius: var(--hl-radius-md);
  font-size: 0.9375rem;
  background: var(--hl-bg-input);
  color: var(--hl-text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--hl-primary);
  box-shadow: 0 0 0 3px var(--hl-primary-bg);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--hl-space-md);
  margin-top: var(--hl-space-xl);
  padding-top: var(--hl-space-md);
  border-top: 1px solid var(--hl-border-light);
}

.btn-cancel,
.btn-submit {
  padding: var(--hl-space-sm) var(--hl-space-lg);
  border: none;
  border-radius: var(--hl-radius-md);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
}

.btn-cancel {
  background: var(--hl-border);
  color: var(--hl-text);
}

.btn-cancel:hover {
  background: var(--hl-text-muted);
  color: #fff;
}

.btn-submit {
  background: var(--hl-primary);
  color: #fff;
}

.btn-submit:hover:not(:disabled) {
  background: var(--hl-primary-hover);
}

.btn-submit:disabled {
  background: var(--hl-border);
  cursor: not-allowed;
  transform: none;
}

/* ----- Responsive ----- */
@media (max-width: 992px) {
  .dish-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dish-list {
    grid-template-columns: 1fr;
    gap: var(--hl-space-md);
  }

  .filter-bar__btn span {
    display: none;
  }

  .filter-bar__btn .el-icon {
    margin: 0;
  }

  .add-dish-btn {
    width: 100%;
    justify-content: center;
  }

  .pagination {
    flex-direction: column;
    gap: var(--hl-space-sm);
  }

  .modal-content {
    max-height: 85vh;
  }
}
</style>
