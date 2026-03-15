<template>
  <div class="admin-tables">
    <div class="header">
      <div class="title-section">
        <h2>Quản lý bàn ăn</h2>
        <p>Quản lý và theo dõi tình trạng bàn ăn trong nhà hàng</p>
      </div>
      <el-button type="warning" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        Đặt bàn mới
      </el-button>
    </div>

    <!-- Thống kê tổng quan -->
    <div class="summary-cards">
      <div class="summary-card orange-border">
        <div class="card-content">
          <h3>Tổng số bàn</h3>
          <p class="value">{{ summary.totalTables }} bàn</p>
        </div>
        <div class="card-icon orange">
          <el-icon><Grid /></el-icon>
        </div>
      </div>

      <div class="summary-card green-border">
        <div class="card-content">
          <h3>Bàn trống</h3>
          <p class="value green">{{ summary.availableTables }} bàn</p>
        </div>
        <div class="card-icon green">
          <el-icon><CircleCheck /></el-icon>
        </div>
      </div>

      <div class="summary-card orange-border">
        <div class="card-content">
          <h3>Đang phục vụ</h3>
          <p class="value orange">{{ summary.occupiedTables }} bàn</p>
        </div>
        <div class="card-icon orange">
          <el-icon><Clock /></el-icon>
        </div>
      </div>

      <div class="summary-card yellow-border">
        <div class="card-content">
          <h3>Doanh thu hiện tại</h3>
          <p class="value yellow">{{ formatCurrency(summary.currentRevenue) }}</p>
        </div>
        <div class="card-icon yellow">
          <el-icon><Money /></el-icon>
        </div>
      </div>
    </div>

    <!-- Tìm kiếm và lọc -->
    <div class="filter-section">
      <el-input
        v-model="searchQuery"
        placeholder="Tìm kiếm bàn..."
        :prefix-icon="Search"
        clearable
        @input="filterTables"
      />
      <el-select v-model="filterStatus" placeholder="Tất cả bàn" @change="filterTables">
        <el-option label="Tất cả bàn" value="" />
        <el-option label="Bàn trống" value="available" />
        <el-option label="Đang phục vụ" value="occupied" />
        <el-option label="Đã đặt trước" value="pre-ordered" />
      </el-select>
    </div>

    <!-- Danh sách bàn -->
    <div class="tables-grid">
      <div
        v-for="table in filteredTables"
        :key="table.table_id"
        :class="['table-card', getStatusClass(table.status)]"
        @click="viewTableDetail(table)"
      >
        <div class="table-header">
          <h3>B{{ table.table_number }}</h3>
          <el-tag :type="getTagType(table.status)">{{
            getStatusText(table.status)
          }}</el-tag>
        </div>

        <div class="table-info">
          <p class="capacity">{{ table.capacity }} chỗ</p>

          <!-- CHỈ hiển thị nếu CÓ activeReservation -->
          <div v-if="table.activeReservation" class="reservation-info">
            <p class="guests">
              <el-icon><User /></el-icon>
              {{ table.activeReservation.number_of_guests }} khách
            </p>
            <p class="time">
              <el-icon><Clock /></el-icon>
              {{ formatTime(table.activeReservation.reservation_time) }}
            </p>
            <p class="revenue">{{ formatCurrency(table.totalRevenue) }}</p>
          </div>

          <!-- Nếu KHÔNG có activeReservation (bàn trống thật sự) -->
          <div v-else class="empty-info">
            <p style="color: #10b981; font-weight: 600">Sẵn sàng phục vụ</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog thêm bàn -->
    <el-dialog v-model="showAddDialog" title="Thêm bàn mới" width="500px">
      <el-form :model="newTable" label-width="120px">
        <el-form-item label="Số bàn">
          <el-input
            v-model.number="newTable.table_number"
            type="number"
            placeholder="Nhập số bàn"
          />
        </el-form-item>
        <el-form-item label="Số ghế">
          <el-input
            v-model.number="newTable.capacity"
            type="number"
            placeholder="Nhập số ghế"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">Hủy</el-button>
        <el-button type="primary" @click="addTable">Thêm bàn</el-button>
      </template>
    </el-dialog>

    <!-- Dialog chi tiết bàn -->
    <el-dialog v-model="showDetailDialog" title="Chi tiết bàn" width="700px" @open="onDetailDialogOpen">
      <div v-if="selectedTable" class="table-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Số bàn"
            >B{{ selectedTable.table_number }}</el-descriptions-item
          >
          <el-descriptions-item label="Số ghế"
            >{{ selectedTable.capacity }} chỗ</el-descriptions-item
          >
          <el-descriptions-item label="Trạng thái">
            <el-tag :type="getTagType(selectedTable.status)">{{
              getStatusText(selectedTable.status)
            }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Doanh thu">{{
            formatCurrency(selectedTable.totalRevenue)
          }}</el-descriptions-item>
        </el-descriptions>

        <!-- Đơn hàng của bàn (API nhân viên phục vụ) -->
        <div class="orders-section">
          <div class="orders-section-header">
            <h4>Đơn hàng bàn</h4>
            <el-button type="primary" size="small" @click="openCreateOrderDialog">
              <el-icon><Plus /></el-icon>
              Tạo đơn
            </el-button>
          </div>
          <div v-loading="tableOrdersLoading" class="orders-list">
            <template v-if="tableOrders.length === 0 && !tableOrdersLoading">
              <p class="text-muted">Chưa có đơn nào. Nhấn "Tạo đơn" để thêm món.</p>
            </template>
            <template v-else>
              <div v-for="order in tableOrders" :key="order.order_id" class="order-block">
                <div class="order-meta">Đơn #{{ order.order_id }}</div>
                <div
                  v-for="oi in order.OrderItems || []"
                  :key="oi.order_item_id"
                  class="order-item-row"
                >
                  <span>{{ oi.MenuItem?.name }} x {{ oi.quantity }}</span>
                  <el-tag v-if="oi.status === 'served'" type="success" size="small">Đã phục vụ</el-tag>
                  <el-button
                    v-else
                    type="primary"
                    size="small"
                    link
                    @click="markItemServed(oi.order_item_id)"
                  >
                    Đánh dấu đã phục vụ
                  </el-button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="actions">
          <el-button @click="showEditDialog">Sửa</el-button>
          <el-button type="danger" @click="deleteTable(selectedTable)">Xóa</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- Dialog tạo đơn (chọn món) -->
    <el-dialog v-model="showCreateOrderDialog" title="Tạo đơn hàng" width="560px">
      <div v-loading="menuItemsLoading" class="create-order-form">
        <p v-if="selectedTable" class="table-info">Bàn B{{ selectedTable?.table_number }}</p>
        <el-scrollbar max-height="320px">
          <div class="menu-list">
            <div v-for="item in menuItemsForOrder" :key="item.item_id" class="menu-row">
              <span class="menu-name">{{ item.name }}</span>
              <el-input-number
                v-model="orderQuantities[item.item_id]"
                :min="0"
                :max="20"
                size="small"
                style="width: 120px"
              />
            </div>
          </div>
        </el-scrollbar>
        <p v-if="!hasOrderItemsSelected" class="hint">Chọn ít nhất một món với số lượng > 0</p>
      </div>
      <template #footer>
        <el-button @click="showCreateOrderDialog = false">Hủy</el-button>
        <el-button type="primary" :disabled="!hasOrderItemsSelected" @click="submitCreateOrder">
          Tạo đơn
        </el-button>
      </template>
    </el-dialog>

    <!-- Dialog sửa bàn -->
    <el-dialog v-model="showEditDialogVisible" title="Sửa thông tin bàn" width="500px">
      <el-form :model="editTableForm" label-width="120px">
        <el-form-item label="Số bàn">
          <el-input
            v-model.number="editTableForm.table_number"
            type="number"
            placeholder="Nhập số bàn"
          />
        </el-form-item>
        <el-form-item label="Số ghế">
          <el-input
            v-model.number="editTableForm.capacity"
            type="number"
            placeholder="Nhập số ghế"
          />
        </el-form-item>
        <el-form-item label="Trạng thái">
          <el-select v-model="editTableForm.status" placeholder="Chọn trạng thái">
            <el-option label="Trống" value="available" />
            <el-option label="Đang phục vụ" value="occupied" />
            <el-option label="Đã đặt trước" value="pre-ordered" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialogVisible = false">Hủy</el-button>
        <el-button type="primary" @click="updateTable">Cập nhật</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Plus,
  Grid,
  CircleCheck,
  Clock,
  Money,
  Search,
  User,
} from "@element-plus/icons-vue";
import axios from "axios";

const API_BASE = "http://localhost:3000";
const WAITER_API = `${API_BASE}/api/admin/waiter`;
const TABLE_API = `${API_BASE}/api/admin/table`;

const tables = ref([]);
const filteredTables = ref([]);
const summary = ref({
  totalTables: 0,
  availableTables: 0,
  occupiedTables: 0,
  reservedTables: 0,
  currentRevenue: 0,
});

const searchQuery = ref("");
const filterStatus = ref("");
const showAddDialog = ref(false);
const showDetailDialog = ref(false);
const showEditDialogVisible = ref(false);
const selectedTable = ref(null);

// Waiter: đơn hàng theo bàn
const tableOrders = ref([]);
const tableOrdersLoading = ref(false);
const showCreateOrderDialog = ref(false);
const menuItemsForOrder = ref([]);
const menuItemsLoading = ref(false);
const orderQuantities = ref({});

const hasOrderItemsSelected = computed(() =>
  Object.values(orderQuantities.value).some((qty) => qty > 0)
);

const newTable = ref({
  table_number: null,
  capacity: null,
});

const editTableForm = ref({
  table_number: null,
  capacity: null,
  status: "",
});

// Lấy dữ liệu
const fetchTables = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(TABLE_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    tables.value = response.data;
    filteredTables.value = response.data;
  } catch (error) {
    console.error("Lỗi lấy danh sách bàn:", error);
    ElMessage.error("Không thể lấy danh sách bàn");
  }
};

const fetchSummary = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${TABLE_API}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    summary.value = response.data;
  } catch (error) {
    console.error("Lỗi lấy thống kê:", error);
  }
};

// API nhân viên phục vụ: đơn hàng theo bàn
const fetchTableOrders = async (table_id) => {
  if (!table_id) return;
  tableOrdersLoading.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${WAITER_API}/orders`, {
      params: { table_id },
      headers: { Authorization: `Bearer ${token}` },
    });
    tableOrders.value = Array.isArray(res.data) ? res.data : res.data.orders || [];
  } catch (err) {
    console.error("Lỗi lấy đơn hàng bàn:", err);
    tableOrders.value = [];
  } finally {
    tableOrdersLoading.value = false;
  }
};

const onDetailDialogOpen = () => {
  if (selectedTable.value?.table_id) {
    fetchTableOrders(selectedTable.value.table_id);
  }
};

const openCreateOrderDialog = async () => {
  menuItemsForOrder.value = [];
  orderQuantities.value = {};
  menuItemsLoading.value = true;
  showCreateOrderDialog.value = true;
  try {
    const res = await axios.get(`${API_BASE}/api/menu-items`, {
      params: { page: 1, limit: 500 },
    });
    const items = res.data?.items || res.data || [];
    menuItemsForOrder.value = items;
    items.forEach((item) => {
      orderQuantities.value[item.item_id] = 0;
    });
  } catch (err) {
    console.error("Lỗi lấy thực đơn:", err);
    ElMessage.error("Không thể tải thực đơn");
  } finally {
    menuItemsLoading.value = false;
  }
};

const submitCreateOrder = async () => {
  if (!selectedTable.value?.table_id) return;
  const items = Object.entries(orderQuantities.value)
    .filter(([, qty]) => qty > 0)
    .map(([item_id, quantity]) => ({ item_id: Number(item_id), quantity }));
  if (!items.length) {
    ElMessage.warning("Chọn ít nhất một món");
    return;
  }
  try {
    const token = localStorage.getItem("token");
    await axios.post(
      `${WAITER_API}/orders`,
      { table_id: selectedTable.value.table_id, items },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Tạo đơn thành công");
    showCreateOrderDialog.value = false;
    fetchTableOrders(selectedTable.value.table_id);
    fetchTables();
    fetchSummary();
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Tạo đơn thất bại");
  }
};

const markItemServed = async (orderItemId) => {
  try {
    const token = localStorage.getItem("token");
    await axios.patch(
      `${WAITER_API}/order-items/${orderItemId}/served`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Đã đánh dấu đã phục vụ");
    if (selectedTable.value?.table_id) {
      fetchTableOrders(selectedTable.value.table_id);
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Cập nhật thất bại");
  }
};

// Thêm bàn
const addTable = async () => {
  try {
    const token = localStorage.getItem("token");
    await axios.post(TABLE_API, newTable.value, {
      headers: { Authorization: `Bearer ${token}` },
    });
    ElMessage.success("Thêm bàn thành công");
    showAddDialog.value = false;
    newTable.value = { table_number: null, capacity: null };
    fetchTables();
    fetchSummary();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Lỗi thêm bàn");
  }
};

const showEditDialog = () => {
  if (!selectedTable.value) return;

  editTableForm.value = {
    table_number: selectedTable.value.table_number,
    capacity: selectedTable.value.capacity,
    status: selectedTable.value.status,
  };

  showEditDialogVisible.value = true;
};

// Cập nhật bàn
const updateTable = async () => {
  try {
    const token = localStorage.getItem("token");
    const oldTableNumber = selectedTable.value.table_number;

    await axios.put(
      `${TABLE_API}/${oldTableNumber}`,
      editTableForm.value,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    ElMessage.success("Cập nhật bàn thành công");
    showEditDialogVisible.value = false;
    showDetailDialog.value = false;
    fetchTables();
    fetchSummary();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Lỗi cập nhật bàn");
  }
};

// Xóa bàn
const deleteTable = async (table) => {
  try {
    await ElMessageBox.confirm(
      `Bạn có chắc muốn xóa bàn ${table.table_number}?`,
      "Xác nhận xóa",
      {
        confirmButtonText: "Xóa",
        cancelButtonText: "Hủy",
        type: "warning",
      }
    );

    const token = localStorage.getItem("token");
    await axios.delete(`${TABLE_API}/${table.table_number}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    ElMessage.success("Xóa bàn thành công");
    showDetailDialog.value = false;
    fetchTables();
    fetchSummary();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error.response?.data?.message || "Lỗi xóa bàn");
    }
  }
};

// Xem chi tiết
const viewTableDetail = (table) => {
  selectedTable.value = table;
  showDetailDialog.value = true;
};

// Lọc bàn
const filterTables = () => {
  let result = tables.value;

  if (searchQuery.value) {
    result = result.filter((t) => t.table_number.toString().includes(searchQuery.value));
  }

  if (filterStatus.value) {
    result = result.filter((t) => t.status === filterStatus.value);
  }

  filteredTables.value = result;
};

// Helper functions
const getStatusClass = (status) => {
  const map = {
    available: "status-available",
    occupied: "status-occupied",
    "pre-ordered": "status-reserved",
  };
  return map[status] || "";
};

const getTagType = (status) => {
  const map = {
    available: "success",
    occupied: "warning",
    "pre-ordered": "info",
  };
  return map[status] || "";
};

const getStatusText = (status) => {
  const map = {
    available: "Trống",
    occupied: "Đang phục vụ",
    "pre-ordered": "Đã đặt trước",
  };
  return map[status] || status;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount || 0
  );
};

const formatTime = (datetime) => {
  if (!datetime) return "";
  return new Date(datetime).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(() => {
  fetchTables();
  fetchSummary();
});
</script>

<style scoped>
.admin-tables {
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title-section h2 {
  margin: 0 0 8px;
  color: #78350f;
  font-size: 28px;
  font-weight: 700;
}

.title-section p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

/* Summary cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.summary-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 3px solid;
}

.summary-card.orange-border {
  border-color: #fed7aa;
}
.summary-card.green-border {
  border-color: #86efac;
}
.summary-card.yellow-border {
  border-color: #fde047;
}

.card-content h3 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.card-content .value {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.value.green {
  color: #10b981;
}
.value.orange {
  color: #f97316;
}
.value.yellow {
  color: #eab308;
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
}

.card-icon.orange {
  background: linear-gradient(135deg, #f97316, #fb923c);
}
.card-icon.green {
  background: linear-gradient(135deg, #10b981, #34d399);
}
.card-icon.yellow {
  background: linear-gradient(135deg, #eab308, #fbbf24);
}

/* Filter section */
.filter-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-section .el-input {
  flex: 1;
  max-width: 400px;
}

.filter-section .el-select {
  width: 200px;
}

/* Tables grid */
.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.table-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 4px solid;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.table-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.table-card.status-available {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.table-card.status-occupied {
  border-color: #f97316;
  background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
}

.table-card.status-reserved {
  border-color: #eab308;
  background: linear-gradient(135deg, #fefce8 0%, #fef08a 100%);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
}

.table-info {
  color: #64748b;
}

.table-info .capacity {
  font-size: 16px;
  margin: 0 0 16px;
  font-weight: 600;
}

.reservation-info p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  font-size: 14px;
  color: #475569;
}

.reservation-info .revenue {
  color: #10b981;
  font-weight: 800;
  font-size: 18px;
  margin-top: 12px;
}

.empty-info p {
  margin: 8px 0;
  font-size: 14px;
}

.table-detail .actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.orders-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.orders-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.orders-section-header h4 {
  margin: 0;
  font-size: 16px;
  color: #1e293b;
}

.orders-list {
  min-height: 60px;
  max-height: 240px;
  overflow-y: auto;
}

.text-muted {
  color: #64748b;
  font-size: 14px;
  margin: 0;
}

.order-block {
  margin-bottom: 12px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.order-meta {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}

.create-order-form .table-info {
  margin-bottom: 12px;
  font-weight: 600;
  color: #78350f;
}

.create-order-form .menu-list {
  padding-right: 8px;
}

.menu-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.menu-row .menu-name {
  flex: 1;
  margin-right: 12px;
}

.create-order-form .hint {
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
}
</style>
