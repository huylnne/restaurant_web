<template>
  <div class="admin-kitchen">
    <div class="header">
      <div class="title-section">
        <h2>Bếp</h2>
        <p>Xem và cập nhật trạng thái món theo đơn</p>
      </div>
    </div>

    <div class="filter-section">
      <el-select
        v-model="selectedBranchId"
        placeholder="Chọn chi nhánh"
        class="filter-branch-select"
        :disabled="!isSuperAdmin"
      >
        <el-option
          v-for="branch in branches"
          :key="branch.branch_id"
          :label="branch.name"
          :value="branch.branch_id"
        />
      </el-select>
      <el-radio-group v-model="currentStatus" @change="fetchOrderItems">
        <el-radio-button value="pending">Chờ chế biến</el-radio-button>
        <el-radio-button value="processing">Đang chế biến</el-radio-button>
        <el-radio-button value="done">Hoàn thành</el-radio-button>
      </el-radio-group>
      <el-button :icon="Refresh" circle @click="fetchOrderItems" title="Làm mới" />
    </div>

    <div v-loading="loading" class="order-items-section">
      <el-empty v-if="!loading && orderItems.length === 0" description="Không có món nào" />
      <div v-else class="items-grid">
        <div
          v-for="item in displayedOrderItems"
          :key="item.order_item_id"
          :class="['item-card', `status-${item.status}`]"
        >
          <div class="item-header">
            <span class="item-name">{{ item.MenuItem?.name || 'N/A' }}</span>
            <el-tag :type="getStatusTagType(item.status)" size="small">
              {{ getStatusText(item.status) }}
            </el-tag>
          </div>
          <div class="item-meta">
            <span>SL: {{ item.quantity }}</span>
            <span class="table-info">
              Bàn: {{ getTableLabel(item) }}
            </span>
            <span v-if="item.MenuItem?.price" class="price">
              {{ formatCurrency(item.MenuItem.price * item.quantity) }}
            </span>
          </div>
          <div class="item-actions">
            <template v-if="item.status === 'pending'">
              <el-button type="warning" size="small" @click="changeStatus(item, 'processing')">
                Bắt đầu chế biến
              </el-button>
            </template>
            <template v-else-if="item.status === 'processing'">
              <el-button type="success" size="small" @click="changeStatus(item, 'done')">
                Hoàn thành
              </el-button>
            </template>
            <template v-else>
              <el-tag type="success">Đã xong</el-tag>
            </template>
          </div>
        </div>
      </div>
    </div>

    <PaginationBar
      v-if="kitchenPaginationTotalPages > 1"
      :current-page="kitchenCurrentPage"
      :total-pages="kitchenPaginationTotalPages"
      @update:current-page="kitchenCurrentPage = $event"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import axios from "axios";
import PaginationBar from "@/components/PaginationBar.vue";
import { getCurrentUser, isSuperAdminUser, getDefaultBranchIdForUser } from "@/utils/adminScope";
import { connectBranchRealtime } from "@/utils/branchRealtime";

const HTTP_ORIGIN = "http://localhost:3000";
const API_BASE = `${HTTP_ORIGIN}/api/admin/kitchen`;
/** UC08: polling ngắn bếp + WebSocket */
const KITCHEN_POLL_MS = 4000;
const KITCHEN_PAGE_SIZE = 12;

const currentStatus = ref("pending");
const orderItems = ref([]);
const branches = ref([]);
const currentUser = getCurrentUser();
const isSuperAdmin = isSuperAdminUser(currentUser);
const selectedBranchId = ref(getDefaultBranchIdForUser(currentUser));
const kitchenCurrentPage = ref(1);
const loading = ref(false);

const kitchenPaginationTotalPages = computed(() =>
  Math.max(1, Math.ceil((orderItems.value?.length || 0) / KITCHEN_PAGE_SIZE))
);
const displayedOrderItems = computed(() => {
  const list = orderItems.value || [];
  const start = (kitchenCurrentPage.value - 1) * KITCHEN_PAGE_SIZE;
  return list.slice(start, start + KITCHEN_PAGE_SIZE);
});

const fetchOrderItems = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${API_BASE}/order-items`, {
      params: { status: currentStatus.value, branchId: selectedBranchId.value },
      headers: { Authorization: `Bearer ${token}` },
    });
    orderItems.value = Array.isArray(res.data) ? res.data : res.data.items || [];
    kitchenCurrentPage.value = 1;
  } catch (err) {
    console.error("Lỗi lấy order items:", err);
    ElMessage.error(err.response?.data?.message || "Không thể tải danh sách món");
    orderItems.value = [];
  } finally {
    loading.value = false;
  }
};

const changeStatus = async (item, status) => {
  try {
    const token = localStorage.getItem("token");
    await axios.patch(
      `${API_BASE}/order-items/${item.order_item_id}/status`,
      { status, branchId: selectedBranchId.value },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Đã cập nhật trạng thái");
    fetchOrderItems();
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Cập nhật thất bại");
  }
};

const getStatusTagType = (status) => {
  const map = { pending: "warning", processing: "primary", done: "success", served: "info" };
  return map[status] || "info";
};

const getStatusText = (status) => {
  const map = {
    pending: "Chờ chế biến",
    processing: "Đang chế biến",
    done: "Hoàn thành",
    served: "Đã phục vụ",
  };
  return map[status] || status;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount || 0
  );
};

const getTableLabel = (item) => {
  if (item?.table_number !== null && item?.table_number !== undefined) return item.table_number;
  if (item?.table_id !== null && item?.table_id !== undefined) return `#${item.table_id}`;
  return "Chưa gán bàn";
};

const fetchBranches = async () => {
  try {
    const res = await axios.get(`${HTTP_ORIGIN}/api/home/branches`);
    branches.value = Array.isArray(res.data) ? res.data : [];
    if (!isSuperAdmin && currentUser?.branch_id) {
      selectedBranchId.value = Number(currentUser.branch_id);
    }
  } catch {
    branches.value = [];
  }
};

let kitchenPollTimer = null;
let disposeKitchenWs = null;

function stopKitchenRealtime() {
  if (kitchenPollTimer) {
    clearInterval(kitchenPollTimer);
    kitchenPollTimer = null;
  }
  if (typeof disposeKitchenWs === "function") {
    disposeKitchenWs();
    disposeKitchenWs = null;
  }
}

function startKitchenRealtime() {
  stopKitchenRealtime();
  kitchenPollTimer = setInterval(() => {
    fetchOrderItems();
  }, KITCHEN_POLL_MS);
  disposeKitchenWs = connectBranchRealtime(HTTP_ORIGIN, selectedBranchId.value, (msg) => {
    if (msg?.type === "order_item_status" || msg?.type === "order_flow") {
      fetchOrderItems();
    }
  });
}

watch(selectedBranchId, () => {
  fetchOrderItems();
  startKitchenRealtime();
});

onMounted(() => {
  fetchBranches().then(() => {
    fetchOrderItems();
    startKitchenRealtime();
  });
});

onUnmounted(() => {
  stopKitchenRealtime();
});
</script>

<style scoped>
.admin-kitchen {
  padding: 0;
  background: var(--hl-admin-bg);
  min-height: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.header {
  margin-bottom: var(--hl-space-lg);
}

.title-section h2 {
  margin: 0 0 var(--hl-space-sm);
  color: var(--hl-primary);
  font-size: 1.75rem;
  font-weight: 700;
}

.title-section p {
  margin: 0;
  color: var(--hl-text-muted);
  font-size: 14px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: var(--hl-space-md);
  margin-bottom: var(--hl-space-lg);
  flex-wrap: wrap;
}
.filter-branch-select {
  width: 220px;
}

.order-items-section {
  min-height: 200px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--hl-admin-grid-min)), 1fr));
  gap: var(--hl-admin-grid-gap);
  width: 100%;
  max-width: 100%;
}

.item-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-lg);
  padding: var(--hl-space-md);
  border-left: 4px solid var(--hl-admin-border);
  box-shadow: var(--hl-shadow-sm);
}

.item-card.status-pending {
  border-left-color: var(--hl-admin-warning);
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.item-card.status-processing {
  border-left-color: var(--hl-admin-info);
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.item-card.status-done {
  border-left-color: var(--hl-admin-success);
  background: linear-gradient(135deg, var(--hl-success-bg) 0%, #d1fae5 100%);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hl-space-sm);
}

.item-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--hl-text);
}

.item-meta {
  display: flex;
  gap: var(--hl-space-md);
  margin-bottom: var(--hl-space-md);
  color: var(--hl-text-muted);
  font-size: 14px;
}

.item-meta .price {
  color: var(--hl-admin-success);
  font-weight: 600;
}

.item-actions {
  margin-top: var(--hl-space-md);
  padding-top: var(--hl-space-md);
  border-top: 1px solid var(--hl-admin-border);
}

@media (max-width: 768px) {
  .filter-section > * {
    width: 100%;
  }

  .filter-branch-select {
    width: 100%;
  }

  .filter-section :deep(.el-radio-group) {
    display: flex;
    width: 100%;
    overflow-x: auto;
  }

  .items-grid {
    grid-template-columns: 1fr;
  }

  .item-meta {
    flex-wrap: wrap;
    gap: var(--hl-space-sm);
  }
}
</style>
