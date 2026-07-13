<template>
  <div class="work-shift-management">
    <el-card class="header-card">
      <div class="header-content">
        <div>
          <h2>Quản lý ca làm việc</h2>
          <p class="subtitle">Lên lịch ca cho nhân viên theo chi nhánh</p>
        </div>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          Thêm ca làm
        </el-button>
      </div>
    </el-card>

    <el-card class="filter-card">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="8">
          <el-select
            v-model="filterBranch"
            placeholder="Chi nhánh"
            :disabled="!isSuperAdmin"
            style="width: 100%"
            @change="onBranchChange"
          >
            <el-option
              v-for="branch in branches"
              :key="branch.branch_id"
              :label="branch.name"
              :value="branch.branch_id"
            />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="→"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            format="DD/MM/YYYY"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            @change="fetchShifts"
          />
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-select
            v-model="filterEmployeeId"
            placeholder="Lọc theo nhân viên"
            clearable
            filterable
            style="width: 100%"
            @change="fetchShifts"
          >
            <el-option
              v-for="emp in branchEmployees"
              :key="emp.employee_id"
              :label="`${emp.full_name} (${emp.position})`"
              :value="emp.employee_id"
            />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="shifts" v-loading="loading" style="width: 100%">
        <el-table-column prop="shift_date" label="Ngày" width="120">
          <template #default="{ row }">{{ formatDate(row.shift_date) }}</template>
        </el-table-column>
        <el-table-column label="Nhân viên" min-width="180">
          <template #default="{ row }">
            <strong>{{ row.employee_name || "—" }}</strong>
            <div class="muted">{{ row.employee_phone || "" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Giờ ca" width="150">
          <template #default="{ row }">{{ row.start_time }} – {{ row.end_time }}</template>
        </el-table-column>
        <el-table-column prop="note" label="Ghi chú" min-width="160" show-overflow-tooltip />
        <el-table-column label="Thao tác" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" type="danger" @click="confirmDelete(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? 'Sửa ca làm việc' : 'Thêm ca làm việc'"
      width="520px"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
        <el-form-item label="Nhân viên" prop="employee_id">
          <el-select
            v-model="formData.employee_id"
            placeholder="Chọn nhân viên"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="emp in branchEmployees"
              :key="emp.employee_id"
              :label="`${emp.full_name} (${emp.position})`"
              :value="emp.employee_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Ngày" prop="shift_date">
          <el-date-picker
            v-model="formData.shift_date"
            type="date"
            placeholder="Chọn ngày"
            format="DD/MM/YYYY"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="Giờ bắt đầu" prop="start_time">
          <el-time-select
            v-model="formData.start_time"
            start="06:00"
            step="00:30"
            end="23:30"
            placeholder="Bắt đầu"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="Giờ kết thúc" prop="end_time">
          <el-time-select
            v-model="formData.end_time"
            start="06:30"
            step="00:30"
            end="24:00"
            placeholder="Kết thúc"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="Ghi chú">
          <el-input v-model="formData.note" type="textarea" :rows="2" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          {{ isEdit ? "Cập nhật" : "Thêm mới" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete } from "@element-plus/icons-vue";
import axios from "axios";
import { getCurrentUser, isSuperAdminUser, getDefaultBranchIdForUser } from "@/utils/adminScope";
import { API_ORIGIN } from "@/config/api";

const API_URL = `${API_ORIGIN}/api/admin/work-shifts`;
const currentUser = getCurrentUser();
const isSuperAdmin = isSuperAdminUser(currentUser);

const shifts = ref([]);
const branchEmployees = ref([]);
const branches = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterBranch = ref(getDefaultBranchIdForUser(currentUser));
const filterEmployeeId = ref(null);
const dateRange = ref([]);
const formRef = ref(null);

const formData = reactive({
  shift_id: null,
  employee_id: null,
  branch_id: filterBranch.value,
  shift_date: "",
  start_time: "08:00",
  end_time: "17:00",
  note: "",
});

const rules = {
  employee_id: [{ required: true, message: "Chọn nhân viên", trigger: "change" }],
  shift_date: [{ required: true, message: "Chọn ngày", trigger: "change" }],
  start_time: [{ required: true, message: "Chọn giờ bắt đầu", trigger: "change" }],
  end_time: [{ required: true, message: "Chọn giờ kết thúc", trigger: "change" }],
};

function defaultDateRange() {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 13);
  return [today.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const fetchBranches = async () => {
  const res = await axios.get(`${API_ORIGIN}/api/home/branches`);
  branches.value = Array.isArray(res.data) ? res.data : [];
  if (!isSuperAdmin) {
    filterBranch.value = getDefaultBranchIdForUser(currentUser);
  } else if (branches.value.length && !branches.value.some((b) => b.branch_id === filterBranch.value)) {
    filterBranch.value = branches.value[0].branch_id;
  }
};

const fetchBranchEmployees = async () => {
  try {
    const res = await axios.get(`${API_URL}/employees`, {
      ...authConfig(),
      params: { branchId: filterBranch.value },
    });
    branchEmployees.value = res.data?.employees || [];
  } catch (error) {
    console.error(error);
    branchEmployees.value = [];
  }
};

const onBranchChange = async () => {
  filterEmployeeId.value = null;
  currentPage.value = 1;
  await fetchBranchEmployees();
  await fetchShifts();
};

const fetchShifts = async () => {
  loading.value = true;
  try {
    const params = {
      branchId: filterBranch.value,
      page: currentPage.value,
      limit: pageSize.value,
    };
    if (filterEmployeeId.value) params.employeeId = filterEmployeeId.value;
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res = await axios.get(API_URL, { ...authConfig(), params });
    shifts.value = res.data?.shifts || [];
    total.value = res.data?.total || 0;
  } catch (error) {
    ElMessage.error("Không thể tải lịch ca");
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
  fetchShifts();
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
  fetchShifts();
};

const resetForm = () => {
  Object.assign(formData, {
    shift_id: null,
    employee_id: null,
    branch_id: filterBranch.value,
    shift_date: "",
    start_time: "08:00",
    end_time: "17:00",
    note: "",
  });
  formRef.value?.clearValidate();
};

const openAddDialog = () => {
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

const openEditDialog = (row) => {
  isEdit.value = true;
  Object.assign(formData, {
    shift_id: row.shift_id,
    employee_id: row.employee_id,
    branch_id: row.branch_id,
    shift_date: row.shift_date,
    start_time: row.start_time,
    end_time: row.end_time,
    note: row.note || "",
  });
  dialogVisible.value = true;
};

const submitForm = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const payload = {
        employee_id: formData.employee_id,
        branch_id: filterBranch.value,
        shift_date: formData.shift_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        note: formData.note,
      };
      if (isEdit.value) {
        await axios.put(`${API_URL}/${formData.shift_id}`, payload, authConfig());
        ElMessage.success("Cập nhật ca làm thành công");
      } else {
        await axios.post(API_URL, payload, authConfig());
        ElMessage.success("Thêm ca làm thành công");
      }
      dialogVisible.value = false;
      fetchShifts();
    } catch (error) {
      ElMessage.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      submitting.value = false;
    }
  });
};

const confirmDelete = (row) => {
  ElMessageBox.confirm(
    `Xóa ca làm của ${row.employee_name} ngày ${formatDate(row.shift_date)}?`,
    "Xác nhận",
    { type: "warning" }
  ).then(async () => {
    await axios.delete(`${API_URL}/${row.shift_id}`, authConfig());
    ElMessage.success("Đã xóa ca làm");
    fetchShifts();
  });
};

const formatDate = (date) => new Date(date).toLocaleDateString("vi-VN");

onMounted(async () => {
  dateRange.value = defaultDateRange();
  await fetchBranches();
  await fetchBranchEmployees();
  await fetchShifts();
});
</script>

<style scoped>
.work-shift-management {
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
  gap: 12px;
}

.header-content h2 {
  margin: 0;
  color: var(--hl-primary);
}

.subtitle {
  margin: 4px 0 0;
  color: var(--hl-text-muted);
  font-size: 14px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.muted {
  color: var(--hl-text-muted);
  font-size: 12px;
}
</style>
