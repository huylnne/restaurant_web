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
          <p class="value green">{{ summary.emptyTables }} bàn</p>
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
    <el-dialog v-model="showDetailDialog" title="Chi tiết bàn" width="600px">
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

        <div class="actions">
          <el-button @click="showEditDialog">Sửa</el-button>
          <el-button type="danger" @click="deleteTable(selectedTable)">Xóa</el-button>
        </div>
      </div>
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
import { ref, onMounted } from "vue";
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

const tables = ref([]);
const filteredTables = ref([]);
const summary = ref({
  totalTables: 0,
  emptyTables: 0,
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
    const response = await axios.get("http://localhost:3000/api/admin/table", {
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
    const response = await axios.get("http://localhost:3000/api/admin/table/summary", {
      headers: { Authorization: `Bearer ${token}` },
    });
    summary.value = response.data;
  } catch (error) {
    console.error("Lỗi lấy thống kê:", error);
  }
};

// Thêm bàn
const addTable = async () => {
  try {
    const token = localStorage.getItem("token");
    await axios.post("http://localhost:3000/api/admin/table", newTable.value, {
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
      `http://localhost:3000/api/admin/table/${oldTableNumber}`,
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
    await axios.delete(`http://localhost:3000/api/admin/table/${table.table_number}`, {
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
</style>
