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
      <!-- Admin / manager: thêm món -->
      <button v-if="canManage" class="add-dish-btn" @click="openAddModal">
        <el-icon><Plus /></el-icon>
        Thêm món
      </button>
    </div>
    <div v-if="isAdminView || branches.length > 1" class="branch-selector">
      <el-select
        v-model="selectedBranchId"
        placeholder="Chọn chi nhánh"
        style="width: 220px"
        :disabled="isAdminView && !isSuperAdmin"
        @change="onBranchChange"
      >
        <el-option
          v-for="branch in branches"
          :key="branch.branch_id"
          :label="branch.name"
          :value="branch.branch_id"
        />
      </el-select>
    </div>

    <MenuHighlightSections
      v-if="!isAdminView"
      :branch-id="selectedBranchId"
      @order="handleOrderClick"
    />

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
        <div ref="dishListRef" class="dish-list">
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
                <MenuItemPrice :dish="dish" />
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
          :total-pages="totalPages"
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
            <label>Giá khuyến mãi (để trống nếu không giảm)</label>
            <input
              v-model.number="formState.sale_price"
              type="number"
              min="0"
              placeholder="VD: 38000"
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
// MenuPageContent — giao diện trang thực đơn (dùng cho cả public lẫn admin).
// Toàn bộ logic (lọc, phân trang, CRUD, gọi món) nằm trong composable useMenuPage; file này chỉ dựng UI.
import { Plus, Edit, Delete } from "@element-plus/icons-vue";
import PaginationBar from "@/components/PaginationBar.vue";
import MenuHighlightSections from "@/components/MenuHighlightSections.vue";
import MenuItemPrice from "@/components/MenuItemPrice.vue";
import { useMenuPage } from "@/features/menu/composables/useMenuPage";

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (v) => ["public", "admin"].includes(v), // chỉ nhận 2 chế độ
  },
});

// Lấy state + hàm từ composable, truyền mode để nó biết đang ở chế độ nào.
const {
  categoryOptions,
  isAdminView,
  canManage,
  isAdmin,
  isSuperAdmin,
  branches,
  selectedBranchId,
  selectedCategory,
  currentPage,
  dishListRef,
  showModal,
  modalMode,
  submitting,
  formState,
  totalPages,
  filteredMenuItems,
  onBranchChange,
  selectCategory,
  handleOrderClick,
  openAddModal,
  openEditModal,
  closeModal,
  confirmDelete,
  handleSubmit,
} = useMenuPage({ mode: props.mode });
</script>

<style scoped>
.menu-page {
  min-height: 100%;
  padding: var(--hl-space-lg);
  background: var(--hl-bg-section);
}

.menu-page--admin {
  background: var(--hl-admin-bg);
  padding: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
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
  font-family: var(--hl-font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--hl-secondary);
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
  background: var(--hl-gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--hl-radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 4px 12px rgba(161, 101, 0, 0.25);
}

.add-dish-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(161, 101, 0, 0.35);
}

.add-dish-btn .el-icon {
  font-size: 1.125rem;
}

/* ----- Thanh lọc danh mục ----- */
.menu-content {
  width: 100%;
  max-width: 100%;
}

.branch-selector {
  margin-bottom: var(--hl-space-md);
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--hl-space-lg);
  width: 100%;
  max-width: 100%;
}

.menu-page--admin .dish-list {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--hl-admin-grid-min)), 1fr));
  gap: var(--hl-admin-grid-gap);
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

.menu-page--admin .dish-info {
  flex: 1;
}

.dish-card:hover {
  transform: translateY(-6px);
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
@media (max-width: 1200px) {
  .dish-list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 992px) {
  .dish-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .branch-selector :deep(.el-select) {
    width: 100% !important;
  }

  .dish-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
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
