<template>
  <div class="admin-reviews">
    <div class="header">
      <div>
        <h2>Quản lý đánh giá</h2>
        <p>Theo dõi phản hồi của khách hàng theo chi nhánh</p>
      </div>
      <div class="filters">
        <el-select
          v-model="selectedBranchId"
          placeholder="Chọn chi nhánh"
          style="width: 220px"
          :disabled="!isSuperAdmin"
          @change="fetchAll"
        >
          <el-option
            v-for="branch in branches"
            :key="branch.branch_id"
            :label="branch.name"
            :value="branch.branch_id"
          />
        </el-select>
        <el-select v-model="ratingFilter" placeholder="Số sao" clearable style="width: 140px" @change="fetchAll">
          <el-option v-for="n in [5,4,3,2,1]" :key="n" :label="`${n} sao`" :value="n" />
        </el-select>
        <el-input
          v-model="keyword"
          clearable
          placeholder="Tìm tên, SĐT, nội dung..."
          style="width: 260px"
          @keyup.enter="fetchAll"
          @clear="fetchAll"
        />
        <el-button type="primary" @click="fetchAll">Làm mới</el-button>
      </div>
    </div>

    <div class="summary-cards">
      <div class="card">
        <div class="label">Tổng đánh giá</div>
        <div class="value">{{ summary.totalReviews }}</div>
      </div>
      <div class="card">
        <div class="label">Điểm trung bình</div>
        <div class="value">{{ summary.avgRating.toFixed(2) }} / 5</div>
      </div>
      <div class="card">
        <div class="label">5 sao</div>
        <div class="value">{{ summary.fiveStar }}</div>
      </div>
      <div class="card">
        <div class="label">Đánh giá thấp (<=2 sao)</div>
        <div class="value">{{ summary.lowRating }}</div>
      </div>
    </div>

    <el-card>
      <el-table :data="reviews" v-loading="loading" stripe style="width: 100%">
        <el-table-column label="Thời gian" width="170">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="full_name" label="Khách hàng" width="180" />
        <el-table-column prop="phone" label="SĐT" width="130" />
        <el-table-column label="Reservation" width="110">
          <template #default="{ row }">#{{ row.reservation_id }}</template>
        </el-table-column>
        <el-table-column label="Bàn" width="80">
          <template #default="{ row }">{{ row.table_number ? `B${row.table_number}` : "-" }}</template>
        </el-table-column>
        <el-table-column label="Sao" width="180">
          <template #default="{ row }">
            <el-rate :model-value="row.rating" disabled show-score text-color="#ff9900" />
          </template>
        </el-table-column>
        <el-table-column prop="comment" label="Nhận xét" min-width="320" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { getCurrentUser, isSuperAdminUser, getDefaultBranchIdForUser } from "@/utils/adminScope";

const API_BASE = "http://localhost:3000";
const currentUser = getCurrentUser();
const isSuperAdmin = isSuperAdminUser(currentUser);

const loading = ref(false);
const branches = ref([]);
const selectedBranchId = ref(getDefaultBranchIdForUser(currentUser));
const ratingFilter = ref(null);
const keyword = ref("");
const reviews = ref([]);
const summary = ref({
  totalReviews: 0,
  avgRating: 0,
  fiveStar: 0,
  lowRating: 0,
});

const token = () => localStorage.getItem("token");

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

async function fetchBranches() {
  try {
    const res = await axios.get(`${API_BASE}/api/home/branches`);
    branches.value = Array.isArray(res.data) ? res.data : [];
    if (isSuperAdmin && branches.value.length > 0) {
      const found = branches.value.find((b) => b.branch_id === selectedBranchId.value);
      if (!found) selectedBranchId.value = branches.value[0].branch_id;
    }
  } catch {
    branches.value = [];
  }
}

function buildParams() {
  const params = { branchId: selectedBranchId.value, limit: 200 };
  if (ratingFilter.value) params.rating = ratingFilter.value;
  if (keyword.value.trim()) params.q = keyword.value.trim();
  return params;
}

async function fetchAll() {
  try {
    loading.value = true;
    const headers = { Authorization: `Bearer ${token()}` };
    const params = buildParams();

    const [listRes, summaryRes] = await Promise.all([
      axios.get(`${API_BASE}/api/admin/reviews`, { headers, params }),
      axios.get(`${API_BASE}/api/admin/reviews/summary`, { headers, params }),
    ]);

    reviews.value = listRes.data || [];
    summary.value = summaryRes.data || summary.value;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Không thể tải dữ liệu đánh giá");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await fetchBranches();
  await fetchAll();
});
</script>

<style scoped>
.admin-reviews {
  padding: var(--hl-space-lg);
  background: var(--hl-admin-bg);
  min-height: 100vh;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.header h2 {
  margin: 0 0 6px;
  color: var(--hl-primary);
}
.header p {
  margin: 0;
  color: var(--hl-text-muted);
  font-size: 14px;
}
.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.card {
  background: var(--hl-admin-card);
  border: 1px solid var(--hl-admin-border);
  border-radius: var(--hl-radius-lg);
  padding: 14px;
}
.label {
  color: var(--hl-text-muted);
  font-size: 13px;
}
.value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--hl-text);
}
@media (max-width: 900px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
