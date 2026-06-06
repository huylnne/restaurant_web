<template>
  <p class="menu-item-price" :class="{ 'menu-item-price--sale': dish.is_on_sale }">
    <template v-if="dish.is_on_sale">
      <span class="menu-item-price__sale">
        {{ formatVnd(dish.display_price ?? dish.sale_price) }}
      </span>
      <span class="menu-item-price__old">{{ formatVnd(dish.price) }}</span>
      <span v-if="dish.discount_percent" class="menu-item-price__tag">
        -{{ dish.discount_percent }}%
      </span>
    </template>
    <strong v-else class="menu-item-price__regular">
      {{ formatVnd(dish.price) }}
    </strong>
  </p>
</template>

<script setup>
defineProps({
  dish: { type: Object, required: true },
});

function formatVnd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0 đ";
  return `${Math.round(n).toLocaleString("vi-VN")} đ`;
}
</script>

<style scoped>
.menu-item-price {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
}

.menu-item-price__regular,
.menu-item-price__sale {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--hl-primary);
}

.menu-item-price--sale .menu-item-price__sale {
  color: #e74c3c;
}

.menu-item-price__old {
  font-size: 0.875rem;
  color: var(--hl-text-muted);
  text-decoration: line-through;
}

.menu-item-price__tag {
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  background: #e74c3c;
  padding: 2px 8px;
  border-radius: 999px;
}
</style>
