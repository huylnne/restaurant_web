<template>
  <div class="employee-management">
    <el-card class="header-card">
      <div class="header-content">
        <h2>Quản lý nhân viên</h2>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          Thêm nhân viên
        </el-button>
      </div>
    </el-card>

    <!-- Search & Filter -->
    <el-card class="filter-card">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="Tìm kiếm theo tên hoặc email"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filterBranch"
            placeholder="Chi nhánh"
            clearable
            @change="fetchEmployees"
          >
            <el-option label="Chi nhánh 1" :value="1" />
            <el-option label="Chi nhánh 2" :value="2" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- Employee Table -->
    <el-card class="table-card">
      <el-table
        :data="employees"
        v-loading="loading"
        style="width: 100%"
        :default-sort="{ prop: 'created_at', order: 'descending' }"
      >
        <el-table-column prop="employee_id" label="ID" width="80" />
        <el-table-column label="Tên nhân viên" width="200">
          <template #default="{ row }">
            <div class="user-info">
              <strong>{{ row.User?.full_name }}</strong>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Số điện thoại" width="150">
          <template #default="{ row }">
            {{ row.User?.phone }}
          </template>
        </el-table-column>
        <el-table-column prop="position" label="Chức vụ" width="120">
          <template #default="{ row }">
            <el-tag :type="getPositionType(row.position)">
              {{ getPositionLabel(row.position) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salary" label="Lương" width="150">
          <template #default="{ row }">
            {{ formatCurrency(row.salary) }}
          </template>
        </el-table-column>
        <el-table-column prop="hire_date" label="Ngày vào làm" width="150">
          <template #default="{ row }">
            {{ formatDate(row.hire_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="180" fixed="right">
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

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'"
      width="600px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="140px">
        <el-form-item label="User ID" prop="user_id" v-if="!isEdit">
          <el-input v-model.number="formData.user_id" placeholder="Nhập user_id" />
          <span class="form-hint">Chỉ nhập user_id đã tồn tại trong bảng users</span>
        </el-form-item>

        <el-form-item label="Chi nhánh" prop="branch_id">
          <el-select v-model="formData.branch_id" placeholder="Chọn chi nhánh">
            <el-option label="Chi nhánh 1" :value="1" />
            <el-option label="Chi nhánh 2" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item label="Chức vụ" prop="position">
          <el-select v-model="formData.position" placeholder="Chọn chức vụ">
            <el-option label="Admin" value="admin" />
            <el-option label="Quản lý" value="manager" />
            <el-option label="Bếp" value="kitchen" />
            <el-option label="Phục vụ" value="waiter" />
            <el-option label="Nhân viên" value="user" />
          </el-select>
        </el-form-item>

        <el-form-item label="Lương" prop="salary">
          <el-input
            v-model.number="formData.salary"
            placeholder="Nhập lương"
            type="number"
          />
        </el-form-item>

        <el-form-item label="Ngày vào làm" prop="hire_date">
          <el-date-picker
            v-model="formData.hire_date"
            type="date"
            placeholder="Chọn ngày"
            format="DD/MM/YYYY"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="Trạng thái" prop="status">
          <el-select v-model="formData.status" placeholder="Chọn trạng thái">
            <el-option label="Đang làm việc" value="active" />
            <el-option label="Nghỉ phép" value="on_leave" />
            <el-option label="Đã nghỉ" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">Hủy</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEdit ? "Cập nhật" : "Thêm mới" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Search, Edit, Delete } from "@element-plus/icons-vue";
import axios from "axios";

const API_URL = "http://localhost:3000/api/admin/employees";

// Data
const employees = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);

// Pagination
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

// Filter
const searchQuery = ref("");
const filterBranch = ref(1);

// Form
const formRef = ref(null);
const formData = reactive({
  user_id: "",
  branch_id: 1,
  position: "",
  salary: "",
  hire_date: "",
  status: "active",
});

const rules = {
  user_id: [{ required: true, message: "Vui lòng nhập user_id", trigger: "blur" }],
  branch_id: [{ required: true, message: "Vui lòng chọn chi nhánh", trigger: "change" }],
  position: [{ required: true, message: "Vui lòng chọn chức vụ", trigger: "change" }],
  salary: [{ required: true, message: "Vui lòng nhập lương", trigger: "blur" }],
  hire_date: [
    { required: true, message: "Vui lòng chọn ngày vào làm", trigger: "change" },
  ],
  status: [{ required: true, message: "Vui lòng chọn trạng thái", trigger: "change" }],
};

// Fetch employees
const fetchEmployees = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        branch_id: filterBranch.value,
        page: currentPage.value,
        limit: pageSize.value,
        search: searchQuery.value,
      },
    });
    employees.value = response.data.employees;
    total.value = response.data.total;
  } catch (error) {
    ElMessage.error("Không thể tải danh sách nhân viên");
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// Search
const handleSearch = () => {
  currentPage.value = 1;
  fetchEmployees();
};

// Pagination
const handlePageChange = (page) => {
  currentPage.value = page;
  fetchEmployees();
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
  fetchEmployees();
};

// Open dialogs
const openAddDialog = () => {
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

const openEditDialog = (row) => {
  isEdit.value = true;
  Object.assign(formData, {
    employee_id: row.employee_id,
    user_id: row.user_id,
    branch_id: row.branch_id,
    position: row.position,
    salary: row.salary,
    hire_date: row.hire_date,
    status: row.status,
  });
  dialogVisible.value = true;
};

// Submit form
const submitForm = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (isEdit.value) {
        await axios.put(`${API_URL}/${formData.employee_id}`, formData, config);
        ElMessage.success("Cập nhật thành công");
      } else {
        await axios.post(API_URL, formData, config);
        ElMessage.success("Thêm nhân viên thành công");
      }

      dialogVisible.value = false;
      fetchEmployees();
    } catch (error) {
      ElMessage.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      submitting.value = false;
    }
  });
};

// Delete
const confirmDelete = (row) => {
  ElMessageBox.confirm(
    `Bạn có chắc chắn muốn xóa nhân viên "${row.User?.full_name}"?`,
    "Xác nhận xóa",
    {
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      type: "warning",
    }
  ).then(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/${row.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      ElMessage.success("Xóa thành công");
      fetchEmployees();
    } catch (error) {
      ElMessage.error("Không thể xóa nhân viên");
    }
  });
};

// Reset form
const resetForm = () => {
  Object.assign(formData, {
    user_id: "",
    branch_id: 1,
    position: "",
    salary: "",
    hire_date: "",
    status: "active",
  });
  formRef.value?.clearValidate();
};

// Helpers
const getPositionLabel = (position) => {
  const labels = {
    admin: "Admin",
    manager: "Quản lý",
    kitchen: "Bếp",
    waiter: "Phục vụ",
    user: "Nhân viên",
  };
  return labels[position] || position;
};

const getPositionType = (position) => {
  const types = {
    admin: "danger",
    manager: "warning",
    kitchen: "success",
    waiter: "info",
    user: "",
  };
  return types[position] || "";
};

const getStatusLabel = (status) => {
  const labels = {
    active: "Đang làm",
    on_leave: "Nghỉ phép",
    inactive: "Đã nghỉ",
  };
  return labels[status] || status;
};

const getStatusType = (status) => {
  const types = {
    active: "success",
    on_leave: "warning",
    inactive: "danger",
  };
  return types[status] || "";
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("vi-VN");
};

onMounted(() => {
  fetchEmployees();
});
</script>

<style scoped>
.employee-management {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  color: #78350f;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
  display: block;
}
</style>
