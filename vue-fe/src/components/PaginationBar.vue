<!--
  PaginationBar — thanh phân trang tái sử dụng (nút Trước/Sau + "Trang x / y").
  Dùng v-model:currentPage ở component cha; phát thêm sự kiện prev/next nếu cần bắt riêng.
  Mặc định tự ẩn khi chỉ có 1 trang (trừ khi showWhenSinglePage = true).
-->
<template>
  <div v-if="totalPages > 1 || showWhenSinglePage" class="pagination-bar">
    <!-- Nút về trang trước: chặn khi đang ở trang 1 hoặc bị disabled -->
    <button
      type="button"
      class="pagination-bar__btn"
      :disabled="currentPage <= 1 || disabled"
      aria-label="Trang trước"
      @click="$emit('update:currentPage', currentPage - 1); $emit('prev')"
    >
      <el-icon><ArrowLeft /></el-icon>
      <span>Trước</span>
    </button>
    <!-- Chỉ số trang hiện tại / tổng số trang -->
    <span class="pagination-bar__info">
      Trang {{ currentPage }} / {{ totalPages }}
    </span>
    <!-- Nút sang trang sau: chặn khi đang ở trang cuối hoặc bị disabled -->
    <button
      type="button"
      class="pagination-bar__btn"
      :disabled="currentPage >= totalPages || disabled"
      aria-label="Trang sau"
      @click="$emit('update:currentPage', currentPage + 1); $emit('next')"
    >
      <span>Sau</span>
      <el-icon><ArrowRight /></el-icon>
    </button>
  </div>
</template>

<script setup>
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";

defineProps({
  currentPage: { type: Number, required: true },  // trang hiện tại (v-model)
  totalPages: { type: Number, required: true },   // tổng số trang
  disabled: { type: Boolean, default: false },    // khóa cả 2 nút (vd đang tải)
  /** Hiển thị thanh pagination ngay cả khi chỉ 1 trang */
  showWhenSinglePage: { type: Boolean, default: false },
});

// update:currentPage cho v-model; prev/next để cha xử lý thêm (vd cuộn lên đầu).
defineEmits(["update:currentPage", "prev", "next"]);
</script>

<style scoped>
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--hl-space-lg);
  flex-wrap: wrap;
  margin-top: var(--hl-space-xl);
  padding: var(--hl-space-sm) 0;
}

.pagination-bar__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--hl-space-xs);
  padding: var(--hl-space-sm) var(--hl-space-lg);
  background: var(--hl-primary);
  color: #fff;
  border: none;
  border-radius: var(--hl-radius-md);
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
}

.pagination-bar__btn:hover:not(:disabled) {
  background: var(--hl-primary-hover);
  transform: translateY(-1px);
}

.pagination-bar__btn:disabled {
  background: var(--hl-border);
  color: var(--hl-text-muted);
  cursor: not-allowed;
  transform: none;
}

.pagination-bar__info {
  font-size: 0.9375rem;
  color: var(--hl-text-secondary);
  font-weight: 500;
  min-width: 120px;
  text-align: center;
}

@media (max-width: 480px) {
  .pagination-bar {
    gap: var(--hl-space-sm);
  }

  .pagination-bar__btn {
    flex: 1 1 120px;
    justify-content: center;
    padding: var(--hl-space-sm) var(--hl-space-md);
  }

  .pagination-bar__info {
    order: -1;
    flex: 1 1 100%;
  }
}
</style>
