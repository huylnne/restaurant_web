<template>
  <div class="branch-management">
    <el-card class="header-card">
      <div class="header-content">
        <div>
          <h2>{{ isSuperAdmin ? "Quản lý chi nhánh" : "Chi nhánh của tôi" }}</h2>
          <p class="muted">
            {{ isSuperAdmin ? "Quản trị danh sách chi nhánh toàn hệ thống" : "Cập nhật thông tin chi nhánh bạn phụ trách" }}
          </p>
        </div>
        <el-button v-if="isSuperAdmin" type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          Thêm chi nhánh
        </el-button>
      </div>
    </el-card>

    <el-card v-if="isSuperAdmin" class="table-card">
      <el-table :data="branches" v-loading="loading" style="width: 100%">
        <el-table-column prop="branch_id" label="ID" width="80" />
        <el-table-column prop="name" label="Tên chi nhánh" min-width="220" />
        <el-table-column prop="address" label="Địa chỉ" min-width="260" />
        <el-table-column prop="phone" label="SĐT" width="150" />
        <el-table-column label="Giờ mở cửa" width="160">
          <template #default="{ row }">
            {{ row.open_time || "--:--" }} - {{ row.close_time || "--:--" }}
          </template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'">
              {{ row.is_active ? "Hoạt động" : "Vô hiệu hóa" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              size="small"
              type="warning"
              :disabled="!row.is_active"
              @click="deactivateBranch(row)"
            >
              <el-icon><CloseBold /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-else class="my-branch-card" v-loading="loading">
      <el-form :model="myBranchForm" :rules="rules" ref="myBranchFormRef" label-width="140px">
        <el-form-item label="Tên chi nhánh" prop="name">
          <el-input v-model="myBranchForm.name" />
        </el-form-item>
        <el-form-item label="Địa chỉ" prop="address">
          <el-input v-model="myBranchForm.address" />
        </el-form-item>
        <el-form-item label="Số điện thoại" prop="phone">
          <el-input v-model="myBranchForm.phone" />
        </el-form-item>
        <el-form-item label="Giờ mở cửa">
          <el-row :gutter="10" style="width: 100%">
            <el-col :span="12">
              <el-input v-model="myBranchForm.open_time" placeholder="VD: 09:00" />
            </el-col>
            <el-col :span="12">
              <el-input v-model="myBranchForm.close_time" placeholder="VD: 22:00" />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="Ảnh chi nhánh">
          <el-input v-model="myBranchForm.image_url" placeholder="URL ảnh" />
        </el-form-item>
        <el-form-item label="Trạng thái">
          <el-switch
            v-model="myBranchForm.is_active"
            inline-prompt
            active-text="Bật"
            inactive-text="Tắt"
          />
        </el-form-item>
      </el-form>
      <div class="actions">
        <el-button type="primary" :loading="saving" @click="saveMyBranch">Lưu thay đổi</el-button>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? 'Cập nhật chi nhánh' : 'Thêm chi nhánh mới'"
      width="620px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="130px">
        <el-form-item label="Tên chi nhánh" prop="name">
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="Địa chỉ" prop="address">
          <el-input v-model="formData.address" />
        </el-form-item>
        <el-form-item label="Số điện thoại" prop="phone">
          <el-input v-model="formData.phone" />
        </el-form-item>
        <el-form-item label="Giờ mở cửa">
          <el-row :gutter="10" style="width: 100%">
            <el-col :span="12">
              <el-input v-model="formData.open_time" placeholder="VD: 09:00" />
            </el-col>
            <el-col :span="12">
              <el-input v-model="formData.close_time" placeholder="VD: 22:00" />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="Ảnh chi nhánh">
          <el-input v-model="formData.image_url" placeholder="URL ảnh" />
        </el-form-item>
        <el-form-item label="Trạng thái">
          <el-switch v-model="formData.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Hủy</el-button>
        <el-button type="primary" :loading="saving" @click="saveBranch">
          {{ isEditing ? "Cập nhật" : "Tạo mới" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, CloseBold } from "@element-plus/icons-vue";
import { isSuperAdminUser } from "@/utils/adminScope";

const API_BASE = "http://localhost:3000/api/admin/branches";

const user = computed(() => JSON.parse(localStorage.getItem("user") || "{}"));
const isAdmin = computed(() => user.value?.role === "admin");
const isSuperAdmin = computed(() => isSuperAdminUser(user.value));

const token = () => localStorage.getItem("token");
const authHeader = () => ({ Authorization: `Bearer ${token()}` });

const loading = ref(false);
const saving = ref(false);
const branches = ref([]);

const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const myBranchFormRef = ref(null);
const currentBranchId = ref(null);

const emptyBranch = () => ({
  name: "",
  address: "",
  phone: "",
  open_time: "",
  close_time: "",
  image_url: "",
  is_active: true,
});

const formData = reactive(emptyBranch());
const myBranchForm = reactive(emptyBranch());

const rules = {
  name: [{ required: true, message: "Vui lòng nhập tên chi nhánh", trigger: "blur" }],
  address: [{ required: true, message: "Vui lòng nhập địa chỉ", trigger: "blur" }],
};

function assignForm(target, source = {}) {
  target.name = source.name || "";
  target.address = source.address || "";
  target.phone = source.phone || "";
  target.open_time = source.open_time || "";
  target.close_time = source.close_time || "";
  target.image_url = source.image_url || "";
  target.is_active = source.is_active !== false;
}

async function fetchBranches() {
  loading.value = true;
  try {
    const res = await axios.get(API_BASE, { headers: authHeader() });
    branches.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Không thể tải danh sách chi nhánh");
  } finally {
    loading.value = false;
  }
}

async function fetchMyBranch() {
  loading.value = true;
  try {
    const res = await axios.get(`${API_BASE}/my`, { headers: authHeader() });
    assignForm(myBranchForm, res.data || {});
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Không thể tải chi nhánh");
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  isEditing.value = false;
  currentBranchId.value = null;
  assignForm(formData, {});
  dialogVisible.value = true;
}

function openEditDialog(row) {
  isEditing.value = true;
  currentBranchId.value = row.branch_id;
  assignForm(formData, row);
  dialogVisible.value = true;
}

async function saveBranch() {
  if (!formRef.value) return;
  await formRef.value.validate();
  saving.value = true;
  try {
    if (isEditing.value && currentBranchId.value) {
      await axios.put(`${API_BASE}/${currentBranchId.value}`, formData, { headers: authHeader() });
      ElMessage.success("Cập nhật chi nhánh thành công");
    } else {
      await axios.post(API_BASE, formData, { headers: authHeader() });
      ElMessage.success("Tạo chi nhánh thành công");
    }
    dialogVisible.value = false;
    fetchBranches();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Không thể lưu chi nhánh");
  } finally {
    saving.value = false;
  }
}

async function deactivateBranch(row) {
  try {
    await ElMessageBox.confirm(
      `Bạn có chắc muốn vô hiệu hóa "${row.name}"?`,
      "Xác nhận",
      { type: "warning" }
    );
  } catch {
    return;
  }
  try {
    await axios.patch(`${API_BASE}/${row.branch_id}/deactivate`, {}, { headers: authHeader() });
    ElMessage.success("Đã vô hiệu hóa chi nhánh");
    fetchBranches();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Không thể vô hiệu hóa chi nhánh");
  }
}

async function saveMyBranch() {
  if (!myBranchFormRef.value) return;
  await myBranchFormRef.value.validate();
  saving.value = true;
  try {
    await axios.put(`${API_BASE}/my`, myBranchForm, { headers: authHeader() });
    ElMessage.success("Cập nhật chi nhánh thành công");
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Không thể cập nhật chi nhánh");
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  if (isSuperAdmin.value) fetchBranches();
  else fetchMyBranch();
});
</script>

<style scoped>
.branch-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.header-card h2 {
  margin: 0;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.muted {
  margin: 4px 0 0;
  color: #666;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
