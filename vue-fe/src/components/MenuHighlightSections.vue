<template>
  <div v-if="loading || hasContent" class="menu-highlights">
    <section v-if="bestsellers.length" class="highlight-block">
      <div class="highlight-block__head">
        <h2 class="highlight-block__title">
          <span class="highlight-block__icon highlight-block__icon--hot">🔥</span>
          Món bán chạy
        </h2>
        <p class="highlight-block__desc">Được khách order nhiều nhất {{ periodDays }} ngày qua</p>
      </div>
      <div class="highlight-scroll">
        <article
          v-for="dish in bestsellers"
          :key="'best-' + dish.item_id"
          class="highlight-card"
        >
          <div class="highlight-card__media">
            <img :src="dish.image_url || '/images/default.jpg'" :alt="dish.name" />
            <span class="highlight-card__badge highlight-card__badge--hot">Bán chạy</span>
            <span v-if="dish.total_sold" class="highlight-card__sold">
              {{ dish.total_sold }} đã bán
            </span>
          </div>
          <div class="highlight-card__body">
            <h3>{{ dish.name }}</h3>
            <p class="highlight-card__desc">{{ dish.description }}</p>
            <MenuItemPrice :dish="dish" />
            <el-button
              v-if="showOrderButton"
              type="primary"
              class="highlight-card__btn"
              @click="$emit('order', dish)"
            >
              Đặt món
            </el-button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="onSale.length" class="highlight-block">
      <div class="highlight-block__head">
        <h2 class="highlight-block__title">
          <span class="highlight-block__icon highlight-block__icon--sale">🏷</span>
          Đang giảm giá
        </h2>
        <p class="highlight-block__desc">Ưu đãi có hạn tại chi nhánh bạn đang xem</p>
      </div>
      <div class="highlight-scroll">
        <article
          v-for="dish in onSale"
          :key="'sale-' + dish.item_id"
          class="highlight-card highlight-card--sale"
        >
          <div class="highlight-card__media">
            <img :src="dish.image_url || '/images/default.jpg'" :alt="dish.name" />
            <span v-if="dish.discount_percent" class="highlight-card__badge highlight-card__badge--sale">
              -{{ dish.discount_percent }}%
            </span>
          </div>
          <div class="highlight-card__body">
            <h3>{{ dish.name }}</h3>
            <p class="highlight-card__desc">{{ dish.description }}</p>
            <MenuItemPrice :dish="dish" />
            <el-button
              v-if="showOrderButton"
              type="danger"
              plain
              class="highlight-card__btn"
              @click="$emit('order', dish)"
            >
              Đặt món
            </el-button>
          </div>
        </article>
      </div>
    </section>

    <el-skeleton v-if="loading" :rows="2" animated class="highlight-skeleton" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import axios from "axios";
import MenuItemPrice from "@/components/MenuItemPrice.vue";

const props = defineProps({
  branchId: { type: Number, default: 1 },
  showOrderButton: { type: Boolean, default: true },
});

defineEmits(["order"]);

const loading = ref(false);
const bestsellers = ref([]);
const onSale = ref([]);
const periodDays = ref(30);

const hasContent = computed(() => bestsellers.value.length > 0 || onSale.value.length > 0);

async function fetchHighlights() {
  if (!props.branchId) return;
  loading.value = true;
  try {
    const res = await axios.get("/api/menu-items/highlights", {
      params: { branch_id: props.branchId, limit: 8 },
    });
    bestsellers.value = res.data?.bestsellers || [];
    onSale.value = res.data?.on_sale || [];
    periodDays.value = res.data?.period_days || 30;
  } catch {
    bestsellers.value = [];
    onSale.value = [];
  } finally {
    loading.value = false;
  }
}

watch(() => props.branchId, fetchHighlights, { immediate: true });
</script>

<style scoped>
.menu-highlights {
  margin-bottom: var(--hl-space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-xl);
}

.highlight-block__head {
  margin-bottom: var(--hl-space-md);
}

.highlight-block__title {
  margin: 0 0 var(--hl-space-xs);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--hl-text);
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
}

.highlight-block__desc {
  margin: 0;
  font-size: 0.875rem;
  color: var(--hl-text-muted);
}

.highlight-scroll {
  display: flex;
  gap: var(--hl-space-md);
  overflow-x: auto;
  padding-bottom: var(--hl-space-sm);
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.highlight-scroll::-webkit-scrollbar {
  height: 6px;
}

.highlight-scroll::-webkit-scrollbar-thumb {
  background: var(--hl-border);
  border-radius: 999px;
}

.highlight-card {
  flex: 0 0 min(280px, 85vw);
  scroll-snap-align: start;
  background: var(--hl-bg-card);
  border: 1px solid var(--hl-border-light);
  border-radius: var(--hl-radius-lg);
  overflow: hidden;
  box-shadow: var(--hl-shadow-sm);
  display: flex;
  flex-direction: column;
}

.highlight-card--sale {
  border-color: #fecaca;
}

.highlight-card__media {
  position: relative;
  height: 160px;
}

.highlight-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.highlight-card__badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
}

.highlight-card__badge--hot {
  background: #e67e22;
}

.highlight-card__badge--sale {
  background: #e74c3c;
}

.highlight-card__sold {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: var(--hl-radius-sm);
}

.highlight-card__body {
  padding: var(--hl-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-sm);
  flex: 1;
}

.highlight-card__body h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.highlight-card__desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--hl-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.highlight-card__btn {
  margin-top: auto;
  width: 100%;
}

.highlight-skeleton {
  margin-top: var(--hl-space-md);
}
</style>
