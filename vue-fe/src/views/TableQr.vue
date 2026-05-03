<template>
  <div class="qr-page">
    <div class="qr-header">
      <h1 class="title">Bàn {{ tableInfo?.table_number ?? "?" }}</h1>
      <p class="subtitle">Trang này dành cho khách scan QR trên bàn.</p>
    </div>

    <div v-if="loading" class="card card--center">Đang tải thông tin bàn...</div>
    <div v-else-if="error" class="card card--center card--error">
      <p>{{ error }}</p>
      <el-button type="primary" @click="fetchAll">Thử lại</el-button>
    </div>
    <div v-else class="layout">
      <div class="card">
        <div class="row">
          <div>
            <div class="label">Trạng thái</div>
            <div class="value">{{ tableInfo?.status ?? "-" }}</div>
          </div>
          <div>
            <div class="label">Sức chứa</div>
            <div class="value">{{ tableInfo?.capacity ?? "-" }} chỗ</div>
          </div>
        </div>

        <div class="divider" />

        <div>
          <div class="label">Hóa đơn tạm tính</div>
          <div v-if="!bill?.items?.length" class="muted">Chưa có món nào.</div>
          <div v-else class="bill">
            <div v-for="it in bill.items" :key="it.item_id" class="bill-row">
              <span>{{ it.name }} x {{ it.quantity }}</span>
              <strong>{{ formatCurrency(it.line_total) }}</strong>
            </div>
            <div class="bill-total">
              <span>Tổng</span>
              <strong>{{ formatCurrency(bill.total_amount) }}</strong>
            </div>
          </div>
        </div>

        <div class="actions">
          <el-button type="primary" @click="genBankQr" :disabled="bankLoading">
            {{ bankLoading ? "Đang tạo QR..." : "Tạo QR ngân hàng (auto số tiền)" }}
          </el-button>
          <el-button @click="goMyTable">Đi tới “Bàn của tôi”</el-button>
        </div>
      </div>

      <div v-if="bankQrRaw" class="card bank-card">
        <h3 class="bank-title">QR ngân hàng</h3>
        <p class="muted">Quét bằng app ngân hàng sẽ tự điền sẵn số tiền.</p>
        <div class="qr-image-wrap">
          <img v-if="bankQrDataUrl" :src="bankQrDataUrl" alt="Bank QR" class="qr-image" />
        </div>
        <div class="bill-total">
          <span>Số tiền</span>
          <strong>{{ formatCurrency(bankAmount) }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import QRCode from "qrcode";

const API_BASE = "http://localhost:3000";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const error = ref("");
const tableInfo = ref(null);
const bill = ref(null);
const bankLoading = ref(false);
const bankQrRaw = ref("");
const bankQrDataUrl = ref("");
const bankAmount = ref(0);

const token = route.params.token;

const fetchAll = async () => {
  loading.value = true;
  error.value = "";
  try {
    const [tRes, bRes] = await Promise.all([
      axios.get(`${API_BASE}/api/public/tables/by-token/${token}`),
      axios.get(`${API_BASE}/api/public/tables/by-token/${token}/bill`),
    ]);
    tableInfo.value = tRes.data || null;
    bill.value = bRes.data || null;
  } catch (err) {
    console.error(err);
    error.value =
      err.response?.data?.message || "Không thể tải thông tin bàn. Vui lòng thử lại.";
  } finally {
    loading.value = false;
  }
};

onMounted(fetchAll);

const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return n.toLocaleString("vi-VN") + " đ";
};

const goMyTable = () => router.push("/my-table");

const genBankQr = async () => {
  bankLoading.value = true;
  bankQrRaw.value = "";
  bankQrDataUrl.value = "";
  bankAmount.value = 0;
  try {
    const res = await axios.post(`${API_BASE}/api/payments/vietqr`, { tableToken: token });
    bankQrRaw.value = res.data?.vietqrRaw || "";
    bankAmount.value = res.data?.amount || 0;
    if (bankQrRaw.value) {
      bankQrDataUrl.value = await QRCode.toDataURL(bankQrRaw.value, { margin: 1, width: 260 });
    }
  } catch (err) {
    console.error(err);
    const msg = err.response?.data?.error || "Không thể tạo QR ngân hàng.";
    alert(msg);
  } finally {
    bankLoading.value = false;
  }
};
</script>

<style scoped>
.qr-page {
  min-height: 100%;
  padding: var(--hl-space-lg);
  background: var(--hl-bg-section);
}
.qr-header {
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
}
.card {
  background: var(--hl-bg-card);
  border-radius: var(--hl-radius-lg);
  border: 1px solid var(--hl-border-light);
  box-shadow: var(--hl-shadow-sm);
  padding: var(--hl-space-lg);
}
.card--center {
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}
.card--error {
  border-color: var(--hl-error);
}
.row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--hl-space-lg);
}
.label {
  font-size: 0.8125rem;
  color: var(--hl-text-muted);
}
.value {
  font-weight: 700;
  margin-top: 2px;
}
.divider {
  height: 1px;
  background: var(--hl-border-light);
  margin: var(--hl-space-lg) 0;
}
.muted {
  color: var(--hl-text-muted);
  margin-top: 6px;
}
.bill {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bill-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.bill-total {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--hl-border-light);
  display: flex;
  justify-content: space-between;
}
.actions {
  margin-top: var(--hl-space-lg);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.bank-card {
  margin-top: var(--hl-space-lg);
}
.bank-title {
  margin: 0 0 6px;
}
.qr-image-wrap {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--hl-border-light);
  border-radius: var(--hl-radius-md);
  margin-top: 10px;
}
.qr-image {
  width: 260px;
  height: 260px;
  object-fit: contain;
}
@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>

