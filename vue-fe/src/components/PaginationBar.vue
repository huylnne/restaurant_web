<template>
  <div v-if="totalPages > 1 || showWhenSinglePage" class="pagination-bar">
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
    <span class="pagination-bar__info">
      Trang {{ currentPage }} / {{ totalPages }}
    </span>
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
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
  /** Hiển thị thanh pagination ngay cả khi chỉ 1 trang */
  showWhenSinglePage: { type: Boolean, default: false },
});

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
</style>
