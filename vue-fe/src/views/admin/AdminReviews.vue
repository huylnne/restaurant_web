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
          class="filter-branch-select"
          :disabled="!isSuperAdmin"
          @change="handleFilterChange"
        >
          <el-option
            v-for="branch in branches"
            :key="branch.branch_id"
            :label="branch.name"
            :value="branch.branch_id"
          />
        </el-select>
        <el-select
          v-model="ratingFilter"
          placeholder="Số sao"
          clearable
          class="filter-rating-select"
          @change="handleFilterChange"
        >
          <el-option v-for="n in [5,4,3,2,1]" :key="n" :label="`${n} sao`" :value="n" />
        </el-select>
        <el-input
          v-model="keyword"
          clearable
          placeholder="Tìm tên, SĐT, nội dung..."
          class="filter-keyword-input"
          @keyup.enter="handleFilterChange"
          @clear="handleFilterChange"
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

    <el-card class="waiter-stats-card" v-if="waiterStats.length">
      <template #header>
        <span>Đánh giá theo nhân viên phục vụ</span>
      </template>
      <el-table :data="waiterStats" size="small" stripe>
        <el-table-column prop="waiter_name" label="Nhân viên" min-width="160" />
        <el-table-column prop="reviewCount" label="Số đánh giá" width="110" />
        <el-table-column label="Điểm TB" width="100">
          <template #default="{ row }">{{ row.avgRating.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="fiveStar" label="5 sao" width="80" />
        <el-table-column prop="lowRating" label="≤2 sao" width="80" />
      </el-table>
    </el-card>

    <el-card class="reviews-table-card">
      <el-table :data="reviews" v-loading="loading" stripe style="width: 100%">
        <el-table-column label="Thời gian" width="170">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="full_name" label="Khách hàng" width="180" />
        <el-table-column prop="phone" label="SĐT" width="130" />
        <el-table-column label="Phục vụ" width="160">
          <template #default="{ row }">{{ row.waiter_name || "—" }}</template>
        </el-table-column>
        <el-table-column label="Order" width="110">
          <template #default="{ row }">#{{ row.order_id }}</template>
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
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { getCurrentUser, isSuperAdminUser, getDefaultBranchIdForUser } from "@/utils/adminScope";
import { API_ORIGIN } from "@/config/api";

const API_BASE = API_ORIGIN;
const currentUser = getCurrentUser();
const isSuperAdmin = isSuperAdminUser(currentUser);

const loading = ref(false);
const branches = ref([]);
const selectedBranchId = ref(getDefaultBranchIdForUser(currentUser));
const ratingFilter = ref(null);
const keyword = ref("");
const reviews = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const summary = ref({
  totalReviews: 0,
  avgRating: 0,
  fiveStar: 0,
  lowRating: 0,
});
const waiterStats = ref([]);

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
  const params = {
    branchId: selectedBranchId.value,
    page: currentPage.value,
    limit: pageSize.value,
  };
  if (ratingFilter.value) params.rating = ratingFilter.value;
  if (keyword.value.trim()) params.q = keyword.value.trim();
  return params;
}

async function fetchAll() {
  try {
    loading.value = true;
    const headers = { Authorization: `Bearer ${token()}` };
    const params = buildParams();

    const [listRes, summaryRes, waiterStatsRes] = await Promise.all([
      axios.get(`${API_BASE}/api/admin/reviews`, { headers, params }),
      axios.get(`${API_BASE}/api/admin/reviews/summary`, { headers, params }),
      axios.get(`${API_BASE}/api/admin/reviews/waiter-stats`, { headers, params }),
    ]);

    const data = listRes.data || {};
    reviews.value = Array.isArray(data) ? data : data.reviews || [];
    total.value = Array.isArray(data) ? data.length : Number(data.total || 0);
    summary.value = summaryRes.data || summary.value;
    waiterStats.value = waiterStatsRes.data?.stats || [];
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Không thể tải dữ liệu đánh giá");
  } finally {
    loading.value = false;
  }
}

function handleFilterChange() {
  currentPage.value = 1;
  fetchAll();
}

function handlePageChange(page) {
  currentPage.value = page;
  fetchAll();
}

function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
  fetchAll();
}

onMounted(async () => {
  await fetchBranches();
  await fetchAll();
});
</script>

<style scoped>
.admin-reviews {
  padding: 0;
  background: var(--hl-admin-bg);
  min-height: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
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
.filter-branch-select {
  width: 220px;
}
.filter-rating-select {
  width: 140px;
}
.filter-keyword-input {
  width: 260px;
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr));
  gap: var(--hl-admin-grid-gap);
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

.waiter-stats-card {
  margin-bottom: 16px;
}

.reviews-table-card {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.reviews-table-card :deep(.el-table) {
  min-width: 720px;
}

.pagination-container {
  margin-top: var(--hl-space-lg);
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters {
    width: 100%;
  }

  .filters > * {
    width: 100%;
  }

  .filter-branch-select,
  .filter-rating-select,
  .filter-keyword-input {
    width: 100%;
  }
}
</style>
