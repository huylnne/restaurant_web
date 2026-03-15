<template>
  <div class="admin-kitchen">
    <div class="header">
      <div class="title-section">
        <h2>Bếp</h2>
        <p>Xem và cập nhật trạng thái món theo đơn</p>
      </div>
    </div>

    <div class="filter-section">
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
          v-for="item in orderItems"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import axios from "axios";

const API_BASE = "http://localhost:3000/api/admin/kitchen";

const currentStatus = ref("pending");
const orderItems = ref([]);
const loading = ref(false);

const fetchOrderItems = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${API_BASE}/order-items`, {
      params: { status: currentStatus.value },
      headers: { Authorization: `Bearer ${token}` },
    });
    orderItems.value = Array.isArray(res.data) ? res.data : res.data.items || [];
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
      { status },
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

onMounted(() => {
  fetchOrderItems();
});
</script>

<style scoped>
.admin-kitchen {
  padding: var(--hl-space-lg);
  background: var(--hl-admin-bg);
  min-height: 100vh;
  width: 100%;
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
}

.order-items-section {
  min-height: 200px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--hl-space-md);
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
</style>
