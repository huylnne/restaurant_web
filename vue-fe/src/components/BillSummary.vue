<template>
  <div class="bill-summary">
    <div
      v-for="item in items"
      :key="`${item.item_id}-${item.unit_price}`"
      class="bill-summary__item"
    >
      <div class="bill-summary__item-main">
        <div class="bill-summary__item-name">
          {{ item.name }}
          <span v-if="item.has_discount" class="bill-summary__badge">Giảm giá</span>
        </div>
        <div class="bill-summary__item-meta">
          x{{ item.quantity }}
          <template v-if="item.has_discount">
            •
            <span class="bill-summary__price-original">
              {{ formatCurrency(item.original_unit_price) }}
            </span>
            {{ formatCurrency(item.unit_price) }} / món
          </template>
          <template v-else>
            • {{ formatCurrency(item.unit_price) }} / món
          </template>
        </div>
        <div v-if="item.has_discount" class="bill-summary__item-discount">
          Tiết kiệm {{ formatCurrency(item.line_discount) }}
        </div>
      </div>
      <div class="bill-summary__item-amount">
        {{ formatCurrency(item.line_total) }}
      </div>
    </div>

    <div class="bill-summary__totals">
      <div
        v-if="hasDiscount"
        class="bill-summary__row bill-summary__row--muted"
      >
        <span>Tạm tính</span>
        <span>{{ formatCurrency(subtotalBeforeDiscount) }}</span>
      </div>
      <div
        v-if="hasDiscount"
        class="bill-summary__row bill-summary__row--discount"
      >
        <span>Giảm giá</span>
        <span>- {{ formatCurrency(discountTotal) }}</span>
      </div>
      <div class="bill-summary__row bill-summary__row--total">
        <span>{{ totalLabel }}</span>
        <strong>{{ formatCurrency(totalAmount) }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
// BillSummary — bảng tóm tắt hóa đơn: liệt kê từng dòng món (SL, đơn giá, giảm giá) + phần tổng.
// Component "câm" (chỉ hiển thị): mọi con số do cha truyền vào qua props.
import { computed } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] },              // danh sách dòng món đã tính sẵn
  subtotalBeforeDiscount: { type: Number, default: 0 },  // tạm tính trước giảm
  discountTotal: { type: Number, default: 0 },           // tổng giảm giá
  totalAmount: { type: Number, default: 0 },             // số tiền phải trả
  totalLabel: { type: String, default: "Tổng thanh toán" }, // nhãn dòng tổng
});

// Chỉ hiện các dòng "tạm tính"/"giảm giá" khi thực sự có giảm giá.
const hasDiscount = computed(() => Number(props.discountTotal) > 0);

// Định dạng tiền VND, ví dụ 25000 → "25.000 đ".
const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return n.toLocaleString("vi-VN") + " đ";
};
</script>

<style scoped>
.bill-summary__item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--hl-border-light, #eee);
}

.bill-summary__item:last-of-type {
  border-bottom: none;
}

.bill-summary__item-name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bill-summary__badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #c2410c;
  background: #ffedd5;
  border-radius: 999px;
  padding: 2px 8px;
}

.bill-summary__item-meta {
  font-size: 0.875rem;
  color: var(--hl-text-muted, #666);
  margin-top: 2px;
}

.bill-summary__price-original {
  text-decoration: line-through;
  opacity: 0.7;
  margin-right: 4px;
}

.bill-summary__item-discount {
  font-size: 0.8125rem;
  color: #16a34a;
  margin-top: 2px;
}

.bill-summary__item-amount {
  font-weight: 600;
  white-space: nowrap;
}

.bill-summary__totals {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--hl-border-light, #eee);
}

.bill-summary__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
}

.bill-summary__row--muted {
  color: var(--hl-text-muted, #666);
}

.bill-summary__row--discount {
  color: #16a34a;
  font-weight: 500;
}

.bill-summary__row--total {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--hl-border-light, #ddd);
  font-size: 1.05rem;
}
</style>
