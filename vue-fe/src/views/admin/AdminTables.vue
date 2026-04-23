<template>
  <div class="admin-tables">
    <div class="header">
      <div class="title-section">
        <h2>Quản lý bàn ăn</h2>
        <p>Quản lý và theo dõi tình trạng bàn ăn trong nhà hàng</p>
      </div>
      <div style="display:flex;gap:8px">
        <el-select
          v-model="selectedBranchId"
          placeholder="Chọn chi nhánh"
          style="width: 220px"
          :disabled="userRole !== 'admin'"
          @change="handleBranchChange"
        >
          <el-option
            v-for="branch in branches"
            :key="branch.branch_id"
            :label="branch.name"
            :value="branch.branch_id"
          />
        </el-select>
        <el-button :icon="Refresh" @click="() => { fetchTables(); fetchSummary(); }" title="Làm mới">
          Làm mới
        </el-button>
        <el-button v-if="userRole === 'admin'" type="warning" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          Đặt bàn mới
        </el-button>
      </div>
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

      <div class="summary-card reserved-border">
        <div class="card-content">
          <h3>Đã đặt trước</h3>
          <p class="value reserved">{{ summary.reservedTables }} bàn</p>
        </div>
        <div class="card-icon reserved">
          <el-icon><Calendar /></el-icon>
        </div>
      </div>

      <div v-if="userRole !== 'waiter'" class="summary-card yellow-border">
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
        v-for="table in displayedTables"
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

          <!-- Bàn đang phục vụ / đã đặt trước → hiện info reservation -->
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

          <!-- Bàn Trống nhưng có đặt trước tương lai → cảnh báo nhân viên -->
          <div v-else-if="table.upcomingReservation" class="upcoming-reservation-info">
            <p class="status-ready-text">Sẵn sàng phục vụ</p>
            <p class="upcoming-badge">
              <el-icon><Clock /></el-icon>
              Đặt trước lúc {{ formatTime(table.upcomingReservation.reservation_time) }}
              · {{ table.upcomingReservation.number_of_guests }} khách
            </p>
          </div>

          <!-- Trống hoàn toàn -->
          <div v-else class="empty-info">
            <p
              :class="{
                'status-ready-text': normalizeTableStatus(table.status) === 'available',
                'status-reserved-text': normalizeTableStatus(table.status) === 'pre-ordered',
                'status-occupied-text': normalizeTableStatus(table.status) === 'occupied',
              }"
            >
              {{
                normalizeTableStatus(table.status) === 'available'
                  ? 'Sẵn sàng phục vụ'
                  : normalizeTableStatus(table.status) === 'pre-ordered'
                    ? 'Đã đặt trước'
                    : 'Đang phục vụ'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <PaginationBar
      v-if="tablePaginationTotalPages > 1"
      :current-page="tableCurrentPage"
      :total-pages="tablePaginationTotalPages"
      @update:current-page="tableCurrentPage = $event"
    />

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

        <!-- Cảnh báo: bàn Trống nhưng có đặt trước tương lai -->
        <div v-if="selectedTable?.upcomingReservation && normalizeTableStatus(selectedTable?.status) === 'available'"
             class="orders-section upcoming-section">
          <div class="orders-section-header">
            <h4>⏰ Đặt trước sắp tới</h4>
            <el-tag type="warning" size="small">Chưa tới giờ</el-tag>
          </div>
          <div class="upcoming-detail">
            <p>
              <strong>Giờ đặt:</strong>
              {{ new Date(selectedTable.upcomingReservation.reservation_time).toLocaleString('vi-VN') }}
            </p>
            <p>
              <strong>Số khách:</strong>
              {{ selectedTable.upcomingReservation.number_of_guests }} người
            </p>
            <p class="upcoming-note">
              Bàn này có đặt trước, không nên xếp khách vãng lai vào trong khoảng thời gian trên.
            </p>
          </div>
          <!-- Pre-order items nếu có -->
          <div v-if="preOrders.length" style="margin-top:10px">
            <p style="font-size:13px;color:var(--hl-text-muted);margin-bottom:6px">Món đặt trước:</p>
            <div v-for="order in preOrders" :key="order.order_id" class="order-block">
              <div class="order-meta">Đơn #{{ order.order_id }} · Đặt trước</div>
              <div v-for="oi in order.OrderItems || []" :key="oi.order_item_id" class="order-item-row">
                <span>{{ oi.MenuItem?.name }} x {{ oi.quantity }}</span>
                <el-tag type="info" size="small">Chưa chế biến</el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- Đơn hàng của bàn (phiên hiện tại - không bao gồm pre-order) -->
        <div class="orders-section">
          <div class="orders-section-header">
            <h4>Đơn hàng hiện tại</h4>
            <el-button type="primary" size="small" @click="openCreateOrderDialog">
              <el-icon><Plus /></el-icon>
              Tạo đơn
            </el-button>
          </div>
          <div v-loading="tableOrdersLoading" class="orders-list">
            <template v-if="activeOrders.length === 0 && !tableOrdersLoading">
              <p class="text-muted">Chưa có đơn nào trong phiên này.</p>
            </template>
            <template v-else>
              <div v-for="order in activeOrders" :key="order.order_id" class="order-block">
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

        <!-- Hóa đơn tạm tính (đồng bộ với phía user) -->
        <div class="orders-section" v-if="tableBill">
          <div class="orders-section-header">
            <h4>Hóa đơn tạm tính</h4>
          </div>
          <div v-loading="tableBillLoading" class="orders-list">
            <template v-if="!tableBill?.items?.length && !tableBillLoading">
              <p class="text-muted">Chưa có món nào để tính tiền.</p>
            </template>
            <template v-else>
              <div
                v-for="item in tableBill.items"
                :key="item.item_id"
                class="order-item-row"
              >
                <span>{{ item.name }} x {{ item.quantity }}</span>
                <span>{{ formatCurrency(item.line_total) }}</span>
              </div>
              <div class="order-summary">
                <div class="order-summary__row">
                  <span>Tổng cộng</span>
                  <strong>{{ formatCurrency(tableBill.total_amount) }}</strong>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="actions">
          <el-button @click="showEditDialog">Sửa</el-button>
          <el-button v-if="userRole === 'admin'" type="danger" @click="deleteTable(selectedTable)">Xóa</el-button>
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
            :disabled="userRole === 'waiter'"
          />
        </el-form-item>
        <el-form-item label="Số ghế">
          <el-input
            v-model.number="editTableForm.capacity"
            type="number"
            placeholder="Nhập số ghế"
            :disabled="userRole === 'waiter'"
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
import { ref, onMounted, onUnmounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Plus,
  Grid,
  CircleCheck,
  Clock,
  Calendar,
  Money,
  Search,
  User,
  Refresh,
} from "@element-plus/icons-vue";
import axios from "axios";
import {
  normalizeTableStatus,
  getTableStatusLabel,
  getTableStatusClass,
  getTableTagType,
} from "@/constants/tableStatus";
import PaginationBar from "@/components/PaginationBar.vue";

const API_BASE = "http://localhost:3000";
const TABLE_PAGE_SIZE = 12;
const WAITER_API = `${API_BASE}/api/admin/waiter`;
const TABLE_API = `${API_BASE}/api/admin/table`;
const BRANCH_API = `${API_BASE}/api/home/branches`;

const userRole = ref("");
const branches = ref([]);
const selectedBranchId = ref(1);
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
const tableCurrentPage = ref(1);
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

// Bill tạm tính cho bàn (dùng chung với phía user)
const tableBill = ref(null);
const tableBillLoading = ref(false);

const hasOrderItemsSelected = computed(() =>
  Object.values(orderQuantities.value).some((qty) => qty > 0)
);

// Tách đơn hiện tại (PENDING/IN_PROGRESS) vs đơn đặt trước chưa tới giờ (pre-ordered)
const activeOrders = computed(() =>
  tableOrders.value.filter((o) => o.status !== "pre-ordered")
);
const preOrders = computed(() =>
  tableOrders.value.filter((o) => o.status === "pre-ordered")
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

const fetchBranches = async () => {
  try {
    const response = await axios.get(BRANCH_API);
    branches.value = Array.isArray(response.data) ? response.data : [];
    if (branches.value.length > 0) {
      const hasSelected = branches.value.some((b) => b.branch_id === selectedBranchId.value);
      if (!hasSelected) selectedBranchId.value = branches.value[0].branch_id;
    }
  } catch (error) {
    console.error("Lỗi lấy danh sách chi nhánh:", error);
    ElMessage.error("Không thể tải danh sách chi nhánh");
  }
};

// Lấy dữ liệu
const fetchTables = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(TABLE_API, {
      params: { branchId: selectedBranchId.value },
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
      params: { branchId: selectedBranchId.value },
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

const fetchTableBill = async (table_id) => {
  if (!table_id) return;
  tableBillLoading.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${WAITER_API}/tables/${table_id}/bill`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    tableBill.value = res.data || null;
  } catch (err) {
    console.error("Lỗi lấy bill bàn:", err);
    tableBill.value = null;
  } finally {
    tableBillLoading.value = false;
  }
};

const onDetailDialogOpen = () => {
  if (selectedTable.value?.table_id) {
    fetchTableOrders(selectedTable.value.table_id);
    fetchTableBill(selectedTable.value.table_id);
  }
};

const openCreateOrderDialog = async () => {
  menuItemsForOrder.value = [];
  orderQuantities.value = {};
  menuItemsLoading.value = true;
  showCreateOrderDialog.value = true;
  try {
    const res = await axios.get(`${API_BASE}/api/menu-items`, {
      params: { page: 1, limit: 500, branch_id: selectedBranchId.value },
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
    await axios.post(TABLE_API, { ...newTable.value, branch_id: selectedBranchId.value }, {
      params: { branchId: selectedBranchId.value },
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
    status: normalizeTableStatus(selectedTable.value.status) || selectedTable.value.status,
  };

  showEditDialogVisible.value = true;
};

// Cập nhật bàn: admin dùng PUT /api/admin/table/:id, waiter dùng PATCH /api/admin/waiter/tables/:id/status
const updateTable = async () => {
  try {
    const token = localStorage.getItem("token");
    const role = userRole.value;

    if (role === "waiter") {
      await axios.patch(
        `${WAITER_API}/tables/${selectedTable.value.table_id}/status`,
        { status: editTableForm.value.status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } else {
      const oldTableNumber = selectedTable.value.table_number;
      await axios.put(
        `${TABLE_API}/${oldTableNumber}`,
        { ...editTableForm.value, branch_id: selectedBranchId.value },
        {
          params: { branchId: selectedBranchId.value },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    }

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
      params: { branchId: selectedBranchId.value },
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

// Lọc bàn (chuẩn hóa: reserved = pre-ordered)
const filterTables = () => {
  let result = tables.value;

  if (searchQuery.value) {
    result = result.filter((t) => t.table_number.toString().includes(searchQuery.value));
  }

  if (filterStatus.value) {
    result = result.filter(
      (t) => normalizeTableStatus(t.status) === filterStatus.value
    );
  }

  filteredTables.value = result;
  tableCurrentPage.value = 1;
};

const tablePaginationTotalPages = computed(() =>
  Math.max(1, Math.ceil((filteredTables.value?.length || 0) / TABLE_PAGE_SIZE))
);
const displayedTables = computed(() => {
  const list = filteredTables.value || [];
  const start = (tableCurrentPage.value - 1) * TABLE_PAGE_SIZE;
  return list.slice(start, start + TABLE_PAGE_SIZE);
});

// Dùng chung constants/tableStatus
const getStatusClass = getTableStatusClass;
const getTagType = getTableTagType;
const getStatusText = getTableStatusLabel;

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

const handleBranchChange = () => {
  tableCurrentPage.value = 1;
  filterStatus.value = "";
  searchQuery.value = "";
  selectedTable.value = null;
  showDetailDialog.value = false;
  fetchTables();
  fetchSummary();
};

// Tự động làm mới danh sách bàn mỗi 15 giây để đồng bộ khi user đặt bàn
let refreshTimer = null;

function startPolling() {
  refreshTimer = setInterval(() => {
    // Không refresh khi đang mở dialog chi tiết để tránh giật UI
    if (!showDetailDialog.value) {
      fetchTables();
      fetchSummary();
    }
  }, 15000);
}

onMounted(() => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  userRole.value = user?.role || "";
  if (user?.role !== "admin" && user?.branch_id) {
    selectedBranchId.value = Number(user.branch_id) || 1;
  }
  fetchBranches().then(() => {
    fetchTables();
    fetchSummary();
  });
  startPolling();
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped>
.admin-tables {
  padding: var(--hl-space-lg);
  background: var(--hl-admin-bg);
  min-height: 100vh;
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

/* Summary cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.summary-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-xl);
  padding: var(--hl-space-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--hl-shadow-md);
  border: 3px solid var(--hl-admin-border);
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
.summary-card.reserved-border {
  border-color: #93c5fd;
}

.card-content h3 {
  margin: 0 0 var(--hl-space-md);
  font-size: 14px;
  color: var(--hl-text-muted);
  font-weight: 500;
}

.card-content .value {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--hl-text);
}

.value.green {
  color: var(--hl-admin-success);
}
.value.orange {
  color: var(--hl-primary);
}
.value.yellow {
  color: var(--hl-admin-warning);
}
.value.reserved {
  color: #2563eb;
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
  background: linear-gradient(135deg, var(--hl-primary), var(--hl-primary-light));
}
.card-icon.green {
  background: linear-gradient(135deg, var(--hl-admin-success), #34d399);
}
.card-icon.yellow {
  background: linear-gradient(135deg, var(--hl-admin-warning), #fbbf24);
}
.card-icon.reserved {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
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
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-xl);
  padding: var(--hl-space-lg);
  border: 4px solid var(--hl-admin-border);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--hl-shadow-sm);
}

.table-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--hl-shadow-lg);
}

.table-card.status-available {
  border-color: var(--hl-admin-success);
  background: linear-gradient(135deg, var(--hl-success-bg) 0%, #d1fae5 100%);
}

.table-card.status-occupied {
  border-color: var(--hl-primary);
  background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
}

.table-card.status-reserved {
  border-color: var(--hl-admin-warning);
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
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--hl-text);
}

.table-info {
  color: var(--hl-text-muted);
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
  color: var(--hl-admin-success);
  font-weight: 800;
  font-size: 1.125rem;
  margin-top: var(--hl-space-md);
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
  margin-top: var(--hl-space-lg);
  padding-top: var(--hl-space-md);
  border-top: 1px solid var(--hl-admin-border);
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
  color: var(--hl-text-muted);
  font-size: 14px;
  margin: 0;
}

.order-block {
  margin-bottom: var(--hl-space-md);
  padding: var(--hl-space-sm);
  background: var(--hl-admin-bg);
  border-radius: var(--hl-radius-md);
  border: 1px solid var(--hl-admin-border);
}

.order-meta {
  font-size: 12px;
  color: var(--hl-text-muted);
  margin-bottom: var(--hl-space-sm);
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}

.create-order-form .table-info {
  margin-bottom: var(--hl-space-md);
  font-weight: 600;
  color: var(--hl-primary);
}

.create-order-form .menu-list {
  padding-right: 8px;
}

.menu-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--hl-space-sm) 0;
  border-bottom: 1px solid var(--hl-admin-border);
}

.menu-row .menu-name {
  flex: 1;
  margin-right: var(--hl-space-md);
}

.create-order-form .hint {
  margin-top: var(--hl-space-md);
  color: var(--hl-text-muted);
  font-size: 13px;
}

.status-ready-text {
  color: var(--hl-admin-success);
  font-weight: 600;
}

.status-occupied-text {
  color: var(--hl-primary);
  font-weight: 600;
}

.status-reserved-text {
  color: var(--hl-admin-warning);
  font-weight: 600;
}

.order-summary {
  margin-top: var(--hl-space-sm);
  padding-top: var(--hl-space-sm);
  border-top: 2px solid var(--hl-admin-border);
}

.order-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--hl-space-xs) 0;
  font-size: 15px;
}

.order-summary__row span {
  color: var(--hl-text-muted);
  font-weight: 500;
}

.order-summary__row strong {
  color: var(--hl-admin-success);
  font-size: 1.1rem;
  font-weight: 700;
}

/* Badge đặt trước trên card bàn Trống */
.upcoming-reservation-info .upcoming-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 4px 8px;
}

/* Section đặt trước trong dialog */
.upcoming-section {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: var(--hl-radius-md);
  padding: var(--hl-space-md);
}

.upcoming-detail p {
  margin: 4px 0;
  font-size: 14px;
}

.upcoming-note {
  margin-top: 8px !important;
  color: #b45309;
  font-style: italic;
  font-size: 13px !important;
}
</style>
