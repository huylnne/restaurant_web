<template>
  <div class="admin-kitchen">
    <div class="header">
      <div class="title-section">
        <h2>Bếp</h2>
        <p>Danh sách món theo từng bàn — cập nhật trạng thái từng món</p>
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
      <el-radio-group v-model="currentStatus" @change="fetchKitchenQueue">
        <el-radio-button value="pending">Chờ chế biến</el-radio-button>
        <el-radio-button value="processing">Đang chế biến</el-radio-button>
        <el-radio-button value="done">Hoàn thành</el-radio-button>
      </el-radio-group>
      <el-button :icon="Refresh" circle @click="fetchKitchenQueue" title="Làm mới" />
      <span v-if="queueSummary" class="queue-summary">{{ queueSummary }}</span>
    </div>

    <div v-loading="loading" class="tables-section">
      <el-empty v-if="!loading && tableGroups.length === 0" description="Không có món nào" />
      <div v-else class="tables-grid">
        <section
          v-for="group in displayedTableGroups"
          :key="groupKey(group)"
          :class="['table-group-card', group.serve_mode === 'scheduled' ? 'table-group-card--scheduled' : 'table-group-card--active']"
        >
          <header class="table-group-header">
            <div class="table-group-title">
              <h3>Bàn {{ formatTableNumber(group) }}</h3>
              <el-tag v-if="group.booking_group_id" size="small" type="info">Nhóm đặt</el-tag>
            </div>
            <div class="table-group-serve">
              <el-tag
                :type="serveTagType(group)"
                size="small"
                effect="dark"
              >
                {{ group.serve_label }}
              </el-tag>
              <span class="serve-time">{{ formatServeTime(group) }}</span>
              <el-tag v-if="group.is_soon" type="danger" size="small" effect="plain">
                Sắp phục vụ
              </el-tag>
            </div>
            <div class="table-group-meta">
              <span v-if="group.number_of_guests">{{ group.number_of_guests }} khách</span>
              <span>{{ group.items.length }} món</span>
            </div>
          </header>

          <ul class="dish-list">
            <li
              v-for="item in group.items"
              :key="item.order_item_id"
              :class="['dish-row', `dish-row--${item.status}`]"
            >
              <div class="dish-main">
                <span class="dish-name">{{ item.MenuItem?.name || "N/A" }}</span>
                <span class="dish-qty">×{{ item.quantity }}</span>
                <el-tag :type="getStatusTagType(item.status)" size="small">
                  {{ getStatusText(item.status) }}
                </el-tag>
              </div>
              <div class="dish-sub">
                <span v-if="item.ordered_at || item.order_created_at" class="dish-ordered-at">
                  Gọi món: {{ formatDateTime(item.ordered_at || item.order_created_at) }}
                </span>
                <span v-if="item.order_id" class="dish-order-id">Đơn #{{ item.order_id }}</span>
              </div>
              <div class="dish-actions">
                <template v-if="item.status === 'pending'">
                  <el-button type="warning" size="small" @click="changeStatus(item, 'processing')">
                    Bắt đầu
                  </el-button>
                </template>
                <template v-else-if="item.status === 'processing'">
                  <el-button type="success" size="small" @click="changeStatus(item, 'done')">
                    Xong
                  </el-button>
                </template>
                <template v-else>
                  <el-tag type="success" size="small">Đã xong</el-tag>
                </template>
              </div>
            </li>
          </ul>
        </section>
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
import { API_ORIGIN } from "@/config/api";

const HTTP_ORIGIN = API_ORIGIN;
const API_BASE = `${HTTP_ORIGIN}/api/admin/kitchen`;
const KITCHEN_POLL_MS = 4000;
const KITCHEN_PAGE_SIZE = 8;

const currentStatus = ref("pending");
const tableGroups = ref([]);
const totalItems = ref(0);
const branches = ref([]);
const currentUser = getCurrentUser();
const isSuperAdmin = isSuperAdminUser(currentUser);
const selectedBranchId = ref(getDefaultBranchIdForUser(currentUser));
const kitchenCurrentPage = ref(1);
const loading = ref(false);

const kitchenPaginationTotalPages = computed(() =>
  Math.max(1, Math.ceil((tableGroups.value?.length || 0) / KITCHEN_PAGE_SIZE))
);

const displayedTableGroups = computed(() => {
  const list = tableGroups.value || [];
  const start = (kitchenCurrentPage.value - 1) * KITCHEN_PAGE_SIZE;
  return list.slice(start, start + KITCHEN_PAGE_SIZE);
});

const queueSummary = computed(() => {
  if (!tableGroups.value.length) return "";
  return `${tableGroups.value.length} bàn · ${totalItems.value} món`;
});

const fetchKitchenQueue = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${API_BASE}/order-items`, {
      params: { status: currentStatus.value, branchId: selectedBranchId.value },
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res.data;
    if (Array.isArray(data)) {
      tableGroups.value = groupLegacyFlatItems(data);
      totalItems.value = data.length;
    } else {
      tableGroups.value = data.tables || [];
      totalItems.value = data.total_items ?? (data.items?.length || 0);
    }
    kitchenCurrentPage.value = 1;
  } catch (err) {
    console.error("Lỗi lấy hàng đợi bếp:", err);
    ElMessage.error(err.response?.data?.message || "Không thể tải danh sách món");
    tableGroups.value = [];
    totalItems.value = 0;
  } finally {
    loading.value = false;
  }
};

/** Tương thích response phẳng cũ (nếu có). */
function groupLegacyFlatItems(items) {
  const map = new Map();
  for (const item of items) {
    const tid = item.table_id ?? "unknown";
    if (!map.has(tid)) {
      map.set(tid, {
        table_id: item.table_id,
        table_number: item.table_number,
        serve_mode: item.serve_context?.serve_mode || "active",
        serve_label: item.serve_context?.serve_label || "Đang phục vụ",
        serve_at: item.serve_context?.serve_at_iso,
        is_soon: item.serve_context?.is_soon,
        items: [],
      });
    }
    map.get(tid).items.push(item);
  }
  return [...map.values()];
}

const changeStatus = async (item, status) => {
  try {
    const token = localStorage.getItem("token");
    await axios.patch(
      `${API_BASE}/order-items/${item.order_item_id}/status`,
      { status, branchId: selectedBranchId.value },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Đã cập nhật trạng thái");
    fetchKitchenQueue();
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Cập nhật thất bại");
  }
};

const groupKey = (group) =>
  `${group.table_id ?? "x"}-${group.order_id ?? ""}-${group.items?.[0]?.order_item_id ?? ""}`;

const formatTableNumber = (group) => {
  if (group.table_number != null && group.table_number !== "") return group.table_number;
  if (group.table_id != null) return `#${group.table_id}`;
  return "?";
};

const serveTagType = (group) => {
  if (group.serve_mode === "scheduled") return group.is_soon ? "danger" : "warning";
  return "success";
};

const formatServeTime = (group) => {
  if (!group.serve_at) return "";
  const d = new Date(group.serve_at);
  if (group.serve_mode === "scheduled") {
    const mins = group.minutes_until_serve;
    const timeStr = d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (mins != null && mins > 0) return `${timeStr} (còn ~${mins} phút)`;
    if (mins != null && mins <= 0) return `${timeStr} (đã tới giờ)`;
    return timeStr;
  }
  return `Gọi từ ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
};

const formatDateTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusTagType = (status) => {
  const map = { pending: "warning", processing: "primary", done: "success", served: "info" };
  return map[status] || "info";
};

const getStatusText = (status) => {
  const map = {
    pending: "Chờ",
    processing: "Đang làm",
    done: "Xong",
    served: "Đã ra",
  };
  return map[status] || status;
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
    fetchKitchenQueue();
  }, KITCHEN_POLL_MS);
  disposeKitchenWs = connectBranchRealtime(HTTP_ORIGIN, selectedBranchId.value, (msg) => {
    if (msg?.type === "order_item_status" || msg?.type === "order_flow") {
      fetchKitchenQueue();
    }
  });
}

watch(selectedBranchId, () => {
  fetchKitchenQueue();
  startKitchenRealtime();
});

onMounted(() => {
  fetchBranches().then(() => {
    fetchKitchenQueue();
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

.queue-summary {
  color: var(--hl-text-muted);
  font-size: 14px;
  margin-left: auto;
}

.tables-section {
  min-height: 200px;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr));
  gap: var(--hl-admin-grid-gap);
}

.table-group-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-sm);
  border: 1px solid var(--hl-admin-border);
  overflow: hidden;
}

.table-group-card--active {
  border-top: 4px solid var(--hl-admin-success);
}

.table-group-card--scheduled {
  border-top: 4px solid var(--hl-admin-warning);
}

.table-group-header {
  padding: var(--hl-space-md);
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid var(--hl-admin-border);
}

.table-group-title {
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
  margin-bottom: var(--hl-space-xs);
}

.table-group-title h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--hl-primary);
}

.table-group-serve {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--hl-space-sm);
  margin-bottom: var(--hl-space-xs);
}

.serve-time {
  font-size: 13px;
  color: var(--hl-text-secondary);
  font-weight: 500;
}

.table-group-meta {
  display: flex;
  gap: var(--hl-space-md);
  font-size: 13px;
  color: var(--hl-text-muted);
}

.dish-list {
  list-style: none;
  margin: 0;
  padding: var(--hl-space-sm);
}

.dish-row {
  padding: var(--hl-space-sm) var(--hl-space-md);
  border-radius: var(--hl-radius-md);
  margin-bottom: var(--hl-space-xs);
  border-left: 3px solid var(--hl-admin-border);
  background: #fff;
}

.dish-row--pending {
  border-left-color: var(--hl-admin-warning);
  background: #fffbeb;
}

.dish-row--processing {
  border-left-color: var(--hl-admin-info);
  background: #eff6ff;
}

.dish-row--done {
  border-left-color: var(--hl-admin-success);
  background: var(--hl-success-bg);
}

.dish-main {
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.dish-name {
  font-weight: 600;
  color: var(--hl-text);
  flex: 1;
  min-width: 120px;
}

.dish-qty {
  font-weight: 700;
  color: var(--hl-primary);
}

.dish-sub {
  display: flex;
  gap: var(--hl-space-md);
  font-size: 12px;
  color: var(--hl-text-muted);
  margin-bottom: var(--hl-space-xs);
}

.dish-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .filter-section > * {
    width: 100%;
  }

  .filter-branch-select {
    width: 100%;
  }

  .queue-summary {
    margin-left: 0;
    width: 100%;
  }

  .tables-grid {
    grid-template-columns: 1fr;
  }
}
</style>
