<template>
  <div class="operation-logs">
    <div class="page-header">
      <div>
        <h2>Nhật ký thao tác</h2>
        <p>Theo dõi hành động nhân viên và hệ thống trên chi nhánh</p>
      </div>
      <AdminBranchSelect
        v-model="selectedBranchId"
        :branches="branches"
        :disabled="!isSuperAdmin"
        @change="loadLogs"
      />
    </div>

    <div class="filters admin-toolbar">
      <el-input
        v-model="search"
        placeholder="Tìm theo mô tả, user, action..."
        clearable
        style="max-width: 280px"
        @keyup.enter="applyFilters"
      />
      <el-select v-model="moduleFilter" placeholder="Module" clearable style="width: 160px">
        <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
      </el-select>
      <el-select v-model="actionFilter" placeholder="Action" clearable style="width: 140px">
        <el-option v-for="a in actionOptions" :key="a" :label="a" :value="a" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="–"
        start-placeholder="Từ ngày"
        end-placeholder="Đến ngày"
        value-format="YYYY-MM-DD"
        style="max-width: 280px"
      />
      <el-button type="primary" :loading="loading" @click="applyFilters">Lọc</el-button>
      <el-button @click="resetFilters">Xóa lọc</el-button>
    </div>

    <el-table v-loading="loading" :data="logs" stripe border class="logs-table">
      <el-table-column prop="created_at" label="Thời gian" width="170">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column prop="username" label="User" width="120" />
      <el-table-column prop="role" label="Vai trò" width="100" />
      <el-table-column prop="module" label="Module" width="120" />
      <el-table-column prop="action" label="Action" width="120" />
      <el-table-column prop="description" label="Mô tả" min-width="200" show-overflow-tooltip />
      <el-table-column label="HTTP" width="100">
        <template #default="{ row }">
          <span v-if="row.http_method">{{ row.http_method }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="path" label="Path" min-width="180" show-overflow-tooltip />
      <el-table-column prop="status_code" label="Status" width="80" align="center" />
      <el-table-column prop="ip_address" label="IP" width="130" show-overflow-tooltip />
    </el-table>

    <PaginationBar
      v-if="totalPages > 1"
      :current-page="page"
      :total-pages="totalPages"
      @update:current-page="onPageChange"
    />
  </div>
</template>

<script setup>
// OperationLogsPage — trang xem nhật ký thao tác (audit log) theo chi nhánh, có lọc theo từ khóa/module/action/khoảng ngày.
import { ref, onMounted } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { API_ORIGIN } from "@/config/api";
import { formatDateTime, authHeaders } from "@/utils/format";
import PaginationBar from "@/components/PaginationBar.vue";
import AdminBranchSelect from "@/features/admin/shared/components/AdminBranchSelect.vue";
import { useAdminBranchScope } from "@/features/admin/shared/composables/useAdminBranchScope";

const API = `${API_ORIGIN}/api/admin/operation-logs`;

// Quản lý chi nhánh (danh sách + chi nhánh đang chọn + quyền super admin); đổi chi nhánh → tải lại log.
const { branches, selectedBranchId, isSuperAdmin, fetchBranches } = useAdminBranchScope({
  onBranchChange: () => loadLogs(),
});

const logs = ref([]);         // dữ liệu bảng
const loading = ref(false);
const page = ref(1);          // trang hiện tại
const totalPages = ref(1);
const search = ref("");       // từ khóa tìm
const moduleFilter = ref(""); // lọc theo module
const actionFilter = ref(""); // lọc theo hành động
const dateRange = ref(null);  // [từ ngày, đến ngày]

// Danh sách module để đổ vào dropdown lọc.
const moduleOptions = [
  "auth",
  "orders",
  "reservations",
  "tables",
  "menu",
  "payments",
  "kitchen",
  "waiter",
  "reception",
  "users",
  "branches",
  "reports",
];

// Danh sách hành động để lọc.
const actionOptions = ["create", "update", "delete", "login", "logout", "checkout", "check-in"];

// Gom các tham số query gửi lên API; chỉ đính kèm bộ lọc nào thực sự có giá trị.
function buildParams() {
  const params = {
    page: page.value,
    limit: 20,
    branch_id: selectedBranchId.value,
  };
  if (search.value.trim()) params.search = search.value.trim();
  if (moduleFilter.value) params.module = moduleFilter.value;
  if (actionFilter.value) params.action = actionFilter.value;
  if (dateRange.value?.length === 2) {
    params.from = dateRange.value[0];
    params.to = dateRange.value[1];
  }
  return params;
}

// Tải nhật ký theo bộ lọc + trang hiện tại.
async function loadLogs() {
  loading.value = true;
  try {
    const res = await axios.get(API, { params: buildParams(), headers: authHeaders() });
    logs.value = res.data?.data || [];
    totalPages.value = res.data?.pagination?.totalPages || 1;
  } catch (err) {
    logs.value = [];
    ElMessage.error(err.response?.data?.message || "Không tải được nhật ký");
  } finally {
    loading.value = false;
  }
}

// Bấm "Lọc": luôn về trang 1 rồi tải lại.
function applyFilters() {
  page.value = 1;
  loadLogs();
}

// "Xóa lọc": reset mọi bộ lọc về mặc định rồi tải lại.
function resetFilters() {
  search.value = "";
  moduleFilter.value = "";
  actionFilter.value = "";
  dateRange.value = null;
  page.value = 1;
  loadLogs();
}

// Đổi trang từ PaginationBar.
function onPageChange(p) {
  page.value = p;
  loadLogs();
}

// Vào trang: nạp chi nhánh trước, sau đó nạp nhật ký.
onMounted(async () => {
  await fetchBranches();
  await loadLogs();
});
</script>

<style scoped>
.operation-logs {
  padding: 0;
  background: var(--hl-admin-bg);
  min-height: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: var(--hl-space-lg);
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0 0 8px;
  color: var(--hl-primary);
  font-size: 1.75rem;
}

.page-header p {
  margin: 0;
  color: var(--hl-text-muted);
  font-size: 14px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.logs-table {
  width: 100%;
}
</style>
