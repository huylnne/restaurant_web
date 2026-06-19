<template>
  <div class="customer-accounts">
    <el-card class="header-card">
      <div class="header-content">
        <h2>Quản lý tài khoản khách</h2>
        <el-button @click="fetchSummary">
          <el-icon><Refresh /></el-icon>
          Làm mới thống kê
        </el-button>
      </div>
    </el-card>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ summary.total_customers }}</div>
          <div class="stat-label">Tổng khách</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card stat-locked">
          <div class="stat-value">{{ summary.locked_accounts }}</div>
          <div class="stat-label">Đang khóa</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card stat-inactive">
          <div class="stat-value">{{ summary.inactive_accounts }}</div>
          <div class="stat-label">Vô hiệu hóa</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ summary.staff_accounts }}</div>
          <div class="stat-label">Tài khoản staff</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="8">
          <el-input
            v-model="searchQuery"
            placeholder="Tìm username, họ tên, SĐT"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :xs="12" :sm="5">
          <el-select v-model="filterRole" placeholder="Vai trò" @change="handleSearch">
            <el-option label="Khách (user)" value="user" />
            <el-option label="Tất cả vai trò" value="all" />
            <el-option label="Admin" value="admin" />
            <el-option label="Phục vụ" value="waiter" />
            <el-option label="Bếp" value="kitchen" />
            <el-option label="Quản lý" value="manager" />
          </el-select>
        </el-col>
        <el-col :xs="12" :sm="5">
          <el-select v-model="filterStatus" placeholder="Trạng thái" @change="handleSearch">
            <el-option label="Tất cả" value="all" />
            <el-option label="Hoạt động" value="active" />
            <el-option label="Đã khóa" value="locked" />
            <el-option label="Vô hiệu" value="inactive" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="6">
          <el-button type="primary" @click="handleSearch">Tìm kiếm</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="users" v-loading="loading" style="width: 100%">
        <el-table-column prop="user_id" label="ID" width="70" />
        <el-table-column prop="username" label="Username" min-width="120" />
        <el-table-column prop="full_name" label="Họ tên" min-width="140" />
        <el-table-column prop="phone" label="SĐT" width="120" />
        <el-table-column prop="role" label="Vai trò" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Đặt bàn" width="90" align="center">
          <template #default="{ row }">
            {{ row.reservation_count }}
          </template>
        </el-table-column>
        <el-table-column label="Hoạt động" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.is_active !== false"
              :disabled="isSelf(row)"
              @change="(v) => patchStatus(row, { is_active: v })"
            />
          </template>
        </el-table-column>
        <el-table-column label="Khóa" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="!!row.locked"
              active-color="var(--el-color-danger)"
              :disabled="isSelf(row)"
              @change="(v) => patchStatus(row, { locked: v })"
            />
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDetail(row)">Chi tiết</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="Chi tiết tài khoản" width="560px">
      <template v-if="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="ID">{{ detail.user.user_id }}</el-descriptions-item>
          <el-descriptions-item label="Username">{{ detail.user.username }}</el-descriptions-item>
          <el-descriptions-item label="Họ tên">{{ detail.user.full_name }}</el-descriptions-item>
          <el-descriptions-item label="SĐT">{{ detail.user.phone }}</el-descriptions-item>
          <el-descriptions-item label="Vai trò">{{ detail.user.role }}</el-descriptions-item>
          <el-descriptions-item label="Hoạt động">
            {{ detail.user.is_active !== false ? "Có" : "Không" }}
          </el-descriptions-item>
          <el-descriptions-item label="Khóa">
            {{ detail.user.locked ? "Có" : "Không" }}
          </el-descriptions-item>
          <el-descriptions-item label="Tổng đặt bàn">
            {{ detail.stats.reservation_count }}
          </el-descriptions-item>
          <el-descriptions-item label="Đang active">
            {{ detail.stats.active_reservations }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 class="recent-title">5 đặt bàn gần nhất</h4>
        <el-table :data="detail.recent_reservations" size="small">
          <el-table-column prop="reservation_id" label="#" width="60" />
          <el-table-column prop="reservation_time" label="Giờ">
            <template #default="{ row }">{{ formatDate(row.reservation_time) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="TT" />
        </el-table>

        <div class="detail-actions">
          <el-button
            v-if="!detail.user.locked"
            type="danger"
            :disabled="isSelf(detail.user)"
            @click="quickLock(detail.user)"
          >
            Khóa tài khoản spam
          </el-button>
          <el-button
            v-else
            type="success"
            :disabled="isSelf(detail.user)"
            @click="patchStatus(detail.user, { locked: false, is_active: true })"
          >
            Mở khóa
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Refresh } from "@element-plus/icons-vue";
import axios from "axios";
import { getCurrentUser } from "@/utils/adminScope";

const API_URL = "/api/admin/users";
const currentAdmin = getCurrentUser();

const users = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchQuery = ref("");
const filterRole = ref("user");
const filterStatus = ref("all");

const summary = reactive({
  total_customers: 0,
  locked_accounts: 0,
  inactive_accounts: 0,
  staff_accounts: 0,
});

const detailVisible = ref(false);
const detail = ref(null);

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function isSelf(row) {
  return Number(row?.user_id) === Number(currentAdmin?.user_id);
}

const fetchSummary = async () => {
  try {
    const res = await axios.get(`${API_URL}/stats/summary`, { headers: authHeaders() });
    Object.assign(summary, res.data);
  } catch {
    ElMessage.error("Không tải được thống kê");
  }
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await axios.get(API_URL, {
      headers: authHeaders(),
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        search: searchQuery.value,
        role: filterRole.value,
        accountStatus: filterStatus.value,
      },
    });
    users.value = res.data.users;
    total.value = res.data.total;
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Không tải danh sách");
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchUsers();
};

const handlePageChange = (p) => {
  currentPage.value = p;
  fetchUsers();
};

const handleSizeChange = (s) => {
  pageSize.value = s;
  currentPage.value = 1;
  fetchUsers();
};

const patchStatus = async (row, payload) => {
  try {
    await ElMessageBox.confirm(
      `Xác nhận thay đổi trạng thái tài khoản "${row.username}"?`,
      "Xác nhận",
      { type: "warning" }
    );
    await axios.patch(`${API_URL}/${row.user_id}/account-status`, payload, {
      headers: authHeaders(),
    });
    ElMessage.success("Đã cập nhật");
    await fetchUsers();
    await fetchSummary();
    if (detail.value?.user?.user_id === row.user_id) {
      await openDetail(row);
    }
  } catch (err) {
    if (err !== "cancel") {
      ElMessage.error(err.response?.data?.message || "Cập nhật thất bại");
    }
    fetchUsers();
  }
};

const quickLock = (row) => {
  patchStatus(row, { locked: true, is_active: false });
};

const openDetail = async (row) => {
  try {
    const res = await axios.get(`${API_URL}/${row.user_id}`, { headers: authHeaders() });
    detail.value = res.data;
    detailVisible.value = true;
  } catch {
    ElMessage.error("Không tải chi tiết");
  }
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN");
};

onMounted(() => {
  fetchSummary();
  fetchUsers();
});
</script>

<style scoped>
.customer-accounts {
  padding: 0;
  background: var(--hl-admin-bg);
  min-height: 0;
  width: 100%;
}

.header-card,
.filter-card,
.table-card {
  margin-bottom: var(--hl-space-lg);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  color: var(--hl-primary);
}

.stats-row {
  margin-bottom: var(--hl-space-lg);
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--hl-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--hl-text-light);
  margin-top: 4px;
}

.stat-locked .stat-value {
  color: var(--el-color-danger);
}

.stat-inactive .stat-value {
  color: var(--el-color-warning);
}

.pagination-container {
  margin-top: var(--hl-space-lg);
  display: flex;
  justify-content: flex-end;
}

.recent-title {
  margin: var(--hl-space-lg) 0 var(--hl-space-sm);
  font-size: 0.95rem;
}

.detail-actions {
  margin-top: var(--hl-space-lg);
  display: flex;
  gap: 8px;
}
</style>
