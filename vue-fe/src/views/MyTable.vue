<template>
  <div class="my-table-page">
    <div class="my-table-header">
      <h1 class="title">Bàn của tôi</h1>
      <p class="subtitle">
        Xem trạng thái bàn, các món đã gọi và gọi nhân viên thanh toán.
      </p>
    </div>

    <div v-if="loading" class="card card--center">
      <span>Đang tải thông tin bàn của bạn...</span>
    </div>

    <div v-else-if="error" class="card card--center card--error">
      <p>{{ error }}</p>
      <el-button type="primary" @click="fetchCurrentTable">Thử lại</el-button>
    </div>

    <div v-else-if="!activeSession" class="card card--center">
      <p>Hiện tại bạn chưa có bàn nào đang sử dụng.</p>
      <router-link to="/booking" class="link-primary">Đặt bàn ngay</router-link>
    </div>

    <div v-else class="layout">
      <div class="card card--main">
        <div class="card-section card-section--header">
          <div class="table-main-info">
            <h2>
              Bàn số
              <strong>{{ activeSession.table?.table_number ?? "?" }}</strong>
            </h2>
            <p class="muted">
              Số khách:
              {{ activeSession.reservation?.number_of_guests ?? "-" }} •
              Giờ đặt:
              {{ formatDateTime(activeSession.reservation?.reservation_time) }}
            </p>
          </div>
          <div class="table-status">
            <span class="status-pill" :class="'status-' + normalizedTableStatus">
              {{ tableStatusText }}
            </span>
            <span
              v-if="activeSession.reservation?.status === 'waiting_payment'"
              class="status-note"
            >
              Đã gửi yêu cầu thanh toán • Vui lòng chờ nhân viên
            </span>
          </div>
        </div>

        <div class="card-section">
          <h3 class="section-title">Các món đã gọi</h3>
          <div v-if="!orderItems.length" class="empty-state">
            <p>Bạn chưa gọi món nào.</p>
            <router-link
              :to="{
                name: 'OrderMenu',
                query: { reservation_id: activeSession.reservation?.reservation_id },
              }"
              class="link-primary"
            >
              Gọi món ngay
            </router-link>
          </div>
          <div v-else class="order-items">
            <div
              v-for="item in orderItems"
              :key="item.item_id"
              class="order-item"
            >
              <div class="order-item__info">
                <div class="order-item__name">
                  {{ item.name || "Món ăn" }}
                </div>
                <div class="order-item__meta">
                  x{{ item.quantity }} •
                  {{ formatCurrency(item.unit_price || 0) }} / món
                </div>
              </div>
              <div class="order-item__amount">
                {{ formatCurrency(item.line_total || 0) }}
              </div>
            </div>

            <div class="order-summary">
              <div class="order-summary__row">
                <span>Tổng cộng</span>
                <strong>{{ formatCurrency(totalAmount) }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="card-section card-section--footer">
          <el-button
            type="primary"
            class="btn-call"
            :disabled="callDisabled"
            @click="requestBill"
          >
            {{ callButtonText }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import {
  normalizeTableStatus,
  getTableStatusLabel,
} from "@/constants/tableStatus";

const loading = ref(false);
const error = ref("");
const bill = ref(null);

// Chỉ coi là đang phục vụ nếu bàn không ở trạng thái trống
const activeSession = computed(() => {
  if (!bill.value) return null;
  const status = normalizeTableStatus(bill.value.table?.status);
  if (status === "available") return null;
  return bill.value;
});

const fetchCurrentTable = async () => {
  loading.value = true;
  error.value = "";
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      error.value = "Bạn cần đăng nhập để xem bàn của mình.";
      loading.value = false;
      return;
    }
    const res = await axios.get(
      "http://localhost:3000/api/users/me/current-bill",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    bill.value = res.data || null;
  } catch (err) {
    if (err.response?.status === 404) {
      bill.value = null;
    } else {
      console.error("Lỗi khi lấy bàn hiện tại:", err);
      error.value =
        err.response?.data?.message ||
        "Không thể lấy thông tin bàn hiện tại. Vui lòng thử lại.";
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchCurrentTable();
});

const orderItems = computed(() => activeSession.value?.items || []);

const totalAmount = computed(() => activeSession.value?.total_amount || 0);

const normalizedTableStatus = computed(() =>
  normalizeTableStatus(activeSession.value?.table?.status)
);

const tableStatusText = computed(() =>
  getTableStatusLabel(activeSession.value?.table?.status)
);

const callDisabled = computed(
  () =>
    !activeSession.value ||
    activeSession.value.reservation?.status === "waiting_payment" ||
    !orderItems.value.length
);

const callButtonText = computed(() => {
  if (!orderItems.value.length) return "Gọi thanh toán (chưa có món)";
  if (activeSession.value?.reservation?.status === "waiting_payment")
    return "Đã gọi thanh toán";
  return "Gọi nhân viên thanh toán";
});

const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return n.toLocaleString("vi-VN") + " đ";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleString("vi-VN");
};

const requestBill = async () => {
  if (!activeSession.value) return;
  try {
    const token = localStorage.getItem("token");
    await axios.post(
      "http://localhost:3000/api/reservations/request-bill",
      {
        reservation_id: activeSession.value.reservation?.reservation_id,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    ElMessage.success(
      "Đã gửi yêu cầu thanh toán, vui lòng chờ nhân viên hỗ trợ."
    );
    if (bill.value && bill.value.reservation) {
      bill.value = {
        ...bill.value,
        reservation: {
          ...bill.value.reservation,
          status: "waiting_payment",
        },
      };
    }
  } catch (err) {
    console.error("Lỗi yêu cầu thanh toán:", err);
    ElMessage.error(
      err.response?.data?.message ||
        "Không thể gửi yêu cầu thanh toán. Vui lòng thử lại."
    );
  }
};
</script>

<style scoped>
.my-table-page {
  min-height: 100%;
  padding: var(--hl-space-lg);
  background: var(--hl-bg-section);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.my-table-header {
  max-width: 960px;
  margin: 0 auto var(--hl-space-xl);
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
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
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

.card-section--header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--hl-space-lg);
}

.card-section--footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--hl-space-md) var(--hl-space-lg) var(--hl-space-lg);
  border-bottom: none;
}

.table-main-info h2 {
  margin: 0 0 var(--hl-space-xs);
  font-size: 1.4rem;
}

.muted {
  margin: 0;
  font-size: 0.875rem;
  color: var(--hl-text-muted);
}

.table-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--hl-space-xs);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.status-available {
  background: #e8f7ec;
  color: #1b7a34;
}

.status-occupied,
.status-pre-ordered {
  background: #fff4e5;
  color: #b55b07;
}

.status-reserved,
.status-waiting_payment {
  background: #e6f0ff;
  color: #1a4d75;
}

.status-note {
  font-size: 0.8125rem;
  color: var(--hl-text-muted);
}

.section-title {
  margin: 0 0 var(--hl-space-md);
  font-size: 1.1rem;
}

.empty-state {
  text-align: center;
  color: var(--hl-text-muted);
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

.order-items {
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-sm);
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--hl-space-sm) var(--hl-space-md);
  border-radius: var(--hl-radius-md);
  background: var(--hl-bg-muted);
}

.order-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-item__name {
  font-weight: 600;
}

.order-item__meta {
  font-size: 0.8125rem;
  color: var(--hl-text-muted);
}

.order-item__amount {
  font-weight: 600;
}

.order-summary {
  border-top: 1px solid var(--hl-border-light);
  margin-top: var(--hl-space-md);
  padding-top: var(--hl-space-sm);
  display: flex;
  justify-content: flex-end;
}

.order-summary__row {
  display: flex;
  gap: var(--hl-space-md);
  align-items: center;
}

.btn-call {
  min-width: 220px;
}

@media (max-width: 768px) {
  .my-table-page {
    padding: var(--hl-space-md);
  }

  .card-section--header {
    flex-direction: column;
    align-items: flex-start;
  }

  .table-status {
    align-items: flex-start;
  }

  .card-section,
  .card-section--footer {
    padding: var(--hl-space-md);
  }
}
</style>

