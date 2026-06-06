<template>
  <div>
    <el-card class="order-menu-card">
      <h2>Đặt món trước cho bàn đã đặt</h2>
      <p v-if="branchLabel" class="branch-banner">
        Chi nhánh: <strong>{{ branchLabel }}</strong>
      </p>
      <MenuHighlightSections
        :branch-id="branchId"
        :show-order-button="false"
        class="order-menu-highlights"
      />
      <el-empty
        v-if="!menuLoading && menu.length === 0"
        class="menu-empty"
        description="Chi nhánh này chưa có thực đơn. Vui lòng liên hệ nhà hàng hoặc thử lại sau khi quản trị cập nhật menu."
      />
      <el-row v-else :gutter="16">
        <el-col v-for="item in menu" :key="item.item_id" :xs="24" :sm="12" :md="8" class="menu-col">
          <el-card class="menu-item-card">
            <div class="menu-item-content">
              <img
                :src="item.image_url"
                style="width: 100%; height: 140px; object-fit: cover"
              />
              <h3>{{ item.name }}</h3>
              <p>{{ item.description }}</p>
              <MenuItemPrice :dish="item" />

              <el-input-number
                v-model="order[item.item_id]"
                :min="0"
                :max="20"
                label="Số lượng"
                class="input-bottom"
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-button
        v-if="menu.length > 0"
        type="primary"
        style="margin-top: 24px"
        @click="submitOrder"
        :disabled="!hasItemSelected || menuLoading"
        >Đặt món</el-button
      >
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

const route = useRoute();
const router = useRouter();
const reservation_id = route.query.reservation_id;

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

async function resolveBranchForReservation() {
  const fromQuery = Number(route.query.branch_id);
  if (fromQuery > 0) {
    branchId.value = fromQuery;
    await loadBranchLabel(fromQuery);
    return;
  }
  if (!reservation_id) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await axios.get("/api/users/reservations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = res.data?.reservations || res.data || [];
    const found = list.find((r) => String(r.reservation_id) === String(reservation_id));
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
    await resolveBranchForReservation();
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
      order.value[item.item_id] = 0;
    });
  } catch (err) {
    ElMessage.error("Không lấy được thực đơn!");
  } finally {
    menuLoading.value = false;
  }
});

const hasItemSelected = computed(() => Object.values(order.value).some((qty) => qty > 0));

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
      { reservation_id, items },
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
  max-width: 900px;
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

.menu-item-card {
  margin-bottom: var(--hl-space-lg);
  height: 350px;
  position: relative;
  padding-bottom: 60px;
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-sm);
  border: 1px solid var(--hl-border-light);
}

.input-bottom {
  position: absolute;
  bottom: var(--hl-space-md);
  left: var(--hl-space-md);
}

.menu-col {
  display: flex;
}

.menu-col .menu-item-card {
  flex: 1;
}

@media (max-width: 640px) {
  .order-menu-card {
    margin: var(--hl-space-lg) 10px;
    padding: var(--hl-space-md);
  }

  .menu-item-card {
    height: auto;
    min-height: 330px;
    padding-bottom: 70px;
  }
}
</style>
