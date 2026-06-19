<template>
  <div>
    <el-card class="order-menu-card">
      <h2>Đặt món trước cho bàn đã đặt</h2>
      <p v-if="branchLabel" class="branch-banner">
        Chi nhánh: <strong>{{ branchLabel }}</strong>
      </p>
      <MenuHighlightSections
        :branch-id="branchId"
        :show-order-button="true"
        class="order-menu-highlights"
        @order="addDishToOrder"
      />
      <el-empty
        v-if="!menuLoading && menu.length === 0"
        class="menu-empty"
        description="Chi nhánh này chưa có thực đơn. Vui lòng liên hệ nhà hàng hoặc thử lại sau khi quản trị cập nhật menu."
      />
      <el-row v-else :gutter="24" class="menu-grid">
        <el-col v-for="item in menu" :key="item.item_id" :xs="24" :sm="12" :md="8" class="menu-col">
          <el-card class="menu-item-card">
            <div class="menu-item-content">
              <img
                class="menu-item-image"
                :src="item.image_url || DEFAULT_DISH_IMAGE"
                :alt="item.name"
              />
              <h3>{{ item.name }}</h3>
              <p class="menu-item-desc">{{ item.description }}</p>
              <MenuItemPrice :dish="item" />

              <div class="menu-item-actions">
                <el-input-number
                  v-model="order[item.item_id]"
                  :min="0"
                  :max="20"
                  label="Số lượng"
                  class="menu-item-qty"
                />
                <el-button
                  type="primary"
                  class="menu-item-order-btn"
                  @click="addDishToOrder(item)"
                >
                  Đặt món
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <section v-if="selectedItems.length" class="selected-order">
        <div class="selected-order__head">
          <h3>Món đã chọn</h3>
          <span>{{ selectedItems.length }} món</span>
        </div>
        <div class="selected-order__list">
          <div v-for="item in selectedItems" :key="'selected-' + item.item_id" class="selected-order__item">
            <div>
              <strong>{{ item.name }}</strong>
              <p>Số lượng: {{ item.quantity }}</p>
            </div>
            <div class="selected-order__actions">
              <el-button size="small" plain @click="decreaseDishQty(item)">Giảm</el-button>
              <el-button size="small" type="danger" plain @click="removeDishFromOrder(item)">
                Bỏ
              </el-button>
            </div>
          </div>
        </div>
      </section>
      <div v-if="menu.length > 0" class="submit-order-bar">
        <el-button
          type="primary"
          size="large"
          @click="submitOrder"
          :disabled="!hasItemSelected || menuLoading"
        >
          Gửi đơn món đã chọn
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import MenuHighlightSections from "@/components/MenuHighlightSections.vue";
import MenuItemPrice from "@/components/MenuItemPrice.vue";

const DEFAULT_DISH_IMAGE =
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";

const route = useRoute();
const router = useRouter();
const order_id = route.query.order_id;

const menu = ref([]);
const order = ref({});
const menuLoading = ref(true);
const branchId = ref(1);
const branchLabel = ref("");

async function loadBranchLabel(id) {
  try {
    const res = await axios.get("/api/home/branches");
    const list = Array.isArray(res.data) ? res.data : [];
    const b = list.find((x) => Number(x.branch_id) === Number(id));
    branchLabel.value = b?.name || `Chi nhánh #${id}`;
  } catch {
    branchLabel.value = `Chi nhánh #${id}`;
  }
}

async function resolveBranchForOrder() {
  const fromQuery = Number(route.query.branch_id);
  if (fromQuery > 0) {
    branchId.value = fromQuery;
    await loadBranchLabel(fromQuery);
    return;
  }
  if (!order_id) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await axios.get("/api/users/reservations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = res.data?.reservations || res.data || [];
    const found = list.find((o) => String(o.order_id) === String(order_id));
    if (found?.branch_id) {
      branchId.value = Number(found.branch_id);
      branchLabel.value = found.Branch?.name || `Chi nhánh #${found.branch_id}`;
    }
  } catch {
    /* fallback branch_id = 1 */
  }
}

onMounted(async () => {
  menuLoading.value = true;
  try {
    await resolveBranchForOrder();
    const res = await axios.get("/api/menu-items", {
      params: { page: 1, limit: 100, branch_id: branchId.value },
    });
    menu.value = res.data.items || [];

    if (!branchLabel.value && menu.value[0]?.branch_id) {
      branchLabel.value = `Chi nhánh #${branchId.value}`;
    }

    if (menu.value.length === 0) {
      ElMessage.warning(
        `Chi nhánh "${branchLabel.value}" chưa có thực đơn. Mỗi chi nhánh có menu riêng — liên hệ quản trị để cập nhật.`
      );
    }

    menu.value.forEach((item) => {
      if (order.value[item.item_id] == null) order.value[item.item_id] = 0;
    });
  } catch (err) {
    ElMessage.error("Không lấy được thực đơn!");
  } finally {
    menuLoading.value = false;
  }
});

const hasItemSelected = computed(() => Object.values(order.value).some((qty) => qty > 0));

const selectedItems = computed(() =>
  menu.value
    .map((item) => ({
      ...item,
      quantity: Number(order.value[item.item_id] || 0),
    }))
    .filter((item) => item.quantity > 0)
);

const addDishToOrder = (dish) => {
  const itemId = dish?.item_id;
  if (!itemId) return;
  const currentQty = Number(order.value[itemId] || 0);
  if (currentQty >= 20) {
    ElMessage.warning("Mỗi món tối đa 20 phần.");
    return;
  }
  order.value[itemId] = currentQty + 1;
  ElMessage.success(`Đã thêm ${dish.name} vào đơn.`);
};

const decreaseDishQty = (dish) => {
  const itemId = dish?.item_id;
  if (!itemId) return;
  order.value[itemId] = Math.max(0, Number(order.value[itemId] || 0) - 1);
};

const removeDishFromOrder = (dish) => {
  const itemId = dish?.item_id;
  if (!itemId) return;
  order.value[itemId] = 0;
};

const submitOrder = async () => {
  const items = Object.entries(order.value)
    .filter(([id, qty]) => qty > 0)
    .map(([item_id, quantity]) => ({ item_id: Number(item_id), quantity }));

  if (!items.length) {
    ElMessage.warning("Chọn ít nhất 1 món để đặt!");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    await axios.post(
      "/api/orders",
      { order_id, items },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Đặt món trước thành công!");
    router.push("profile");
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Đặt món thất bại!");
  }
};
</script>

<style scoped>
.order-menu-highlights {
  margin-bottom: var(--hl-space-lg);
}

.order-menu-card {
  max-width: 1080px;
  margin: var(--hl-space-2xl) auto;
  padding: var(--hl-space-xl);
  background: var(--hl-bg-section);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  border: 1px solid var(--hl-border-light);
}

.order-menu-card :deep(.el-card__body) {
  padding: var(--hl-space-lg);
}

.order-menu-card h2 {
  color: var(--hl-primary);
  font-weight: 600;
  margin-bottom: var(--hl-space-lg);
}

.branch-banner {
  margin: 0 0 var(--hl-space-md);
  padding: 10px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: var(--hl-radius-md);
  color: var(--hl-text-secondary);
  font-size: 14px;
}

.branch-banner strong {
  color: var(--hl-primary);
}

.menu-empty {
  margin: var(--hl-space-xl) 0;
}

.selected-order {
  margin: var(--hl-space-xl) 0 var(--hl-space-lg);
  padding: var(--hl-space-md);
  background: #fffaf0;
  border: 1px solid #fed7aa;
  border-radius: var(--hl-radius-lg);
}

.selected-order__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hl-space-md);
  margin-bottom: var(--hl-space-sm);
}

.selected-order__head h3 {
  margin: 0;
  color: var(--hl-primary);
  font-size: 1rem;
}

.selected-order__head span {
  color: var(--hl-text-muted);
  font-size: 0.875rem;
}

.selected-order__list {
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-sm);
}

.selected-order__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hl-space-md);
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--hl-border-light);
  border-radius: var(--hl-radius-md);
}

.selected-order__item strong {
  display: block;
  color: var(--hl-text);
  font-size: 0.95rem;
}

.selected-order__item p {
  margin: 3px 0 0;
  color: var(--hl-text-muted);
  font-size: 0.85rem;
}

.selected-order__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.menu-item-card {
  height: 100%;
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-sm);
  border: 1px solid var(--hl-border-light);
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.menu-item-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--hl-shadow-card);
}

.menu-item-card :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.menu-item-content {
  height: 100%;
  min-height: 360px;
  padding: var(--hl-space-md);
  display: flex;
  flex-direction: column;
}

.menu-item-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: var(--hl-radius-md);
  margin-bottom: var(--hl-space-sm);
}

.menu-item-content h3 {
  margin: 0 0 6px;
  font-size: 1rem;
  line-height: 1.35;
  color: var(--hl-text);
}

.menu-item-desc {
  margin: 0 0 var(--hl-space-sm);
  min-height: 42px;
  color: var(--hl-text-secondary);
  font-size: 0.9rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.menu-item-actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: minmax(124px, 1fr) auto;
  gap: var(--hl-space-sm);
  align-items: center;
}

.menu-item-qty {
  width: 100%;
}

.menu-item-order-btn {
  min-width: 92px;
  font-weight: 700;
}

.submit-order-bar {
  position: sticky;
  bottom: 12px;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  margin-top: var(--hl-space-lg);
  padding: var(--hl-space-sm);
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--hl-border-light);
  border-radius: var(--hl-radius-lg);
  backdrop-filter: blur(10px);
}

.menu-col {
  display: flex;
  margin-bottom: 24px;
}

.menu-col .menu-item-card {
  flex: 1;
}

.menu-grid {
  margin-top: var(--hl-space-md);
  margin-bottom: calc(var(--hl-space-lg) * -1);
}

@media (max-width: 640px) {
  .order-menu-card {
    margin: var(--hl-space-lg) 10px;
    padding: var(--hl-space-md);
  }

  .menu-item-card {
    min-height: 0;
  }

  .menu-col {
    margin-bottom: 18px;
  }

  .menu-item-content {
    min-height: 340px;
  }

  .menu-item-actions {
    grid-template-columns: 1fr;
  }

  .selected-order__item {
    align-items: stretch;
    flex-direction: column;
  }

  .selected-order__actions,
  .submit-order-bar {
    justify-content: stretch;
  }

  .selected-order__actions .el-button,
  .submit-order-bar .el-button {
    width: 100%;
    margin-left: 0;
  }

  .selected-order__actions .el-button,
  .submit-order-bar .el-button {
    flex: 1;
  }
}
</style>
