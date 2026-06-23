<template>
  <div class="reservation-bill-page">
    <div class="reservation-bill-header">
      <router-link to="/profile" class="back-link">← Quay lại lịch sử</router-link>
      <h1 class="title">Chi tiết hóa đơn</h1>
      <p class="subtitle">Hóa đơn tạm tính đồng bộ với nhân viên phục vụ.</p>
    </div>

    <div v-if="loading" class="card card--center">
      <span>Đang tải hóa đơn...</span>
    </div>

    <div v-else-if="error" class="card card--center card--error">
      <p>{{ error }}</p>
      <el-button type="primary" @click="fetchBill">Thử lại</el-button>
    </div>

    <div v-else-if="!billData" class="card card--center">
      <p>Không tìm thấy hóa đơn cho lượt đặt bàn này.</p>
      <router-link to="/profile" class="link-primary">Quay lại hồ sơ</router-link>
    </div>

    <div v-else class="layout">
      <div class="card card--main">
        <div class="card-section card-section--header">
          <div class="session-main-info">
            <h2>{{ formatRestaurantName(billData) }}</h2>
            <p class="muted">{{ formatBranchName(billData) }}</p>
            <p v-if="billData.Branch?.address" class="muted">{{ billData.Branch.address }}</p>
            <p class="muted">
              {{ new Date(billData.arrival_time).toLocaleString("vi-VN") }}
              • {{ billData.number_of_guests ?? "-" }} khách
              • Bàn {{ formatTableNumber(billData) }}
            </p>
          </div>
          <div class="session-status">
            <span class="status-pill">{{ getDiningStatusLabel(billData) }}</span>
            <span v-if="billData.Payment?.status === 'succeeded'" class="status-note">
              Đã thanh toán
            </span>
          </div>
        </div>

        <div v-if="billData.note" class="card-section card-section--note">
          <span class="note-label">Ghi chú</span>
          <p class="note-text">{{ billData.note }}</p>
        </div>

        <div class="card-section">
          <h3 class="section-title">Các món đã gọi</h3>
          <div v-if="!billItems.length" class="empty-state">
            <p>Chưa có món nào trong hóa đơn này.</p>
          </div>
          <div v-else class="bill-wrap">
            <BillSummary
              :items="billItems"
              :subtotal-before-discount="billData.subtotal_before_discount"
              :discount-total="billData.discount_total"
              :total-amount="billData.total_amount"
              total-label="Tổng cộng"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import BillSummary from "@/components/BillSummary.vue";
import {
  formatRestaurantNameFromRow,
  formatBranchNameFromRow,
} from "@/utils/branchDisplay";
import {
  getDiningStatusLabel,
  formatTableNumber,
} from "@/utils/reservationDisplay";

const route = useRoute();
const loading = ref(false);
const error = ref("");
const billData = ref(null);

const billItems = computed(() => billData.value?.items || []);

const fetchBill = async () => {
  const orderId = route.params.orderId;
  if (!orderId) {
    error.value = "Mã đơn không hợp lệ.";
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      error.value = "Bạn cần đăng nhập để xem hóa đơn.";
      billData.value = null;
      return;
    }
    const res = await axios.get(`/api/users/reservations/${orderId}/bill`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    billData.value = res.data || null;
  } catch (err) {
    if (err.response?.status === 404) {
      billData.value = null;
      error.value = err.response?.data?.message || "Không tìm thấy hóa đơn.";
    } else {
      console.error("Lỗi khi lấy hóa đơn:", err);
      error.value = err.response?.data?.message || "Không thể tải hóa đơn. Vui lòng thử lại.";
    }
  } finally {
    loading.value = false;
  }
};

const formatRestaurantName = (row) => formatRestaurantNameFromRow(row);
const formatBranchName = (row) => formatBranchNameFromRow(row);

onMounted(fetchBill);

watch(
  () => route.params.orderId,
  () => {
    fetchBill();
  }
);
</script>

<style scoped>
.reservation-bill-page {
  min-height: 100%;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: var(--hl-space-lg) clamp(var(--hl-space-md), 3vw, var(--hl-space-2xl));
  background: var(--hl-bg-section);
}

.reservation-bill-header {
  width: 100%;
  max-width: min(900px, 100%);
  margin: 0 auto var(--hl-space-xl);
}

.back-link {
  display: inline-block;
  margin-bottom: var(--hl-space-sm);
  color: var(--hl-primary);
  font-weight: 600;
  text-decoration: none;
  font-size: 0.9375rem;
}

.back-link:hover {
  text-decoration: underline;
}

.title {
  margin: 0 0 var(--hl-space-xs);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--hl-primary);
}

.subtitle {
  margin: 0;
  color: var(--hl-text-muted);
  font-size: 0.9375rem;
}

.layout {
  width: 100%;
  max-width: min(900px, 100%);
  margin: 0 auto;
}

.card {
  background: var(--hl-bg-card);
  border-radius: var(--hl-radius-lg);
  border: 1px solid var(--hl-border-light);
  box-shadow: var(--hl-shadow-sm);
  padding: var(--hl-space-lg);
}

.card--main {
  padding: 0;
}

.card--center {
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}

.card--error {
  border-color: var(--hl-error);
}

.card-section {
  padding: var(--hl-space-lg);
  border-bottom: 1px solid var(--hl-border-light);
}

.card-section:last-child {
  border-bottom: none;
}

.card-section--header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--hl-space-lg);
}

.card-section--note {
  background: var(--hl-bg-muted);
}

.session-main-info h2 {
  margin: 0 0 var(--hl-space-xs);
  font-size: 1.35rem;
}

.muted {
  margin: 0 0 4px;
  font-size: 0.875rem;
  color: var(--hl-text-muted);
}

.session-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--hl-space-xs);
  flex-shrink: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--hl-primary-bg);
  color: var(--hl-primary);
}

.status-note {
  font-size: 0.8125rem;
  color: var(--hl-success);
  font-weight: 500;
}

.note-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--hl-text-muted);
  margin-bottom: 4px;
}

.note-text {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--hl-text);
  word-break: break-word;
}

.section-title {
  margin: 0 0 var(--hl-space-md);
  font-size: 1.1rem;
}

.empty-state {
  text-align: center;
  color: var(--hl-text-muted);
}

.bill-wrap {
  max-width: 100%;
}

.link-primary {
  display: inline-block;
  margin-top: var(--hl-space-sm);
  color: var(--hl-primary);
  font-weight: 600;
  text-decoration: none;
}

.link-primary:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .reservation-bill-page {
    padding: var(--hl-space-md);
  }

  .card-section--header {
    flex-direction: column;
    align-items: flex-start;
  }

  .session-status {
    align-items: flex-start;
  }

  .card-section {
    padding: var(--hl-space-md);
  }
}
</style>
