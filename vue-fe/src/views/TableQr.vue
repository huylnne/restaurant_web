<template>
  <div class="qr-page">
    <div class="qr-header">
      <h1 class="title">Bàn {{ tableInfo?.table_number ?? "?" }}</h1>
      <p class="subtitle">Quét QR để xem món đã gọi, gọi thêm món và thanh toán.</p>
    </div>

    <div v-if="loading" class="card card--center">Đang tải thông tin bàn...</div>
    <div v-else-if="error" class="card card--center card--error">
      <p>{{ error }}</p>
      <el-button type="primary" @click="fetchAll">Thử lại</el-button>
    </div>
    <div v-else class="layout">
      <section class="card">
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

        <div class="section-head">
          <div>
            <h2>Món đã gọi</h2>
            <p class="muted">Danh sách món hiện tại của bàn.</p>
          </div>
          <el-button size="small" plain @click="refreshBill">Làm mới</el-button>
        </div>

        <div v-if="billLoading" class="muted">Đang cập nhật hóa đơn...</div>
        <div v-else-if="!bill?.items?.length" class="muted">Bàn chưa có món nào.</div>
        <div v-else class="bill">
          <div v-for="it in bill.items" :key="it.item_id" class="bill-row">
            <span>{{ it.name }} x {{ it.quantity }}</span>
            <strong>{{ formatCurrency(it.line_total) }}</strong>
          </div>
          <div class="bill-total">
            <span>Tổng tạm tính</span>
            <strong>{{ formatCurrency(bill.total_amount) }}</strong>
          </div>
        </div>

        <div class="actions">
          <el-button type="primary" @click="genBankQr" :disabled="bankLoading || !bill?.items?.length">
            {{ bankLoading ? "Đang tạo QR..." : "Thanh toán QR ngân hàng" }}
          </el-button>
        </div>
      </section>

      <section class="card">
        <div class="section-head">
          <div>
            <h2>Gọi thêm món</h2>
            <p class="muted">Chọn số lượng rồi bấm gửi món cho nhà hàng.</p>
          </div>
          <span class="selected-count" v-if="selectedItems.length">{{ selectedItems.length }} món đã chọn</span>
        </div>

        <div v-if="menuLoading" class="muted">Đang tải thực đơn...</div>
        <el-empty v-else-if="!menuItems.length" description="Chi nhánh này chưa có thực đơn." />
        <div v-else class="menu-list">
          <article v-for="item in menuItems" :key="item.item_id" class="menu-item">
            <img :src="item.image_url || DEFAULT_DISH_IMAGE" :alt="item.name" class="menu-image" />
            <div class="menu-info">
              <h3>{{ item.name }}</h3>
              <p>{{ item.description || "Món ngon của nhà hàng" }}</p>
              <strong>{{ formatCurrency(getDishPrice(item)) }}</strong>
            </div>
            <el-input-number
              v-model="orderQuantities[item.item_id]"
              :min="0"
              :max="20"
              size="small"
              class="qty"
            />
          </article>
        </div>

        <div class="submit-order-bar">
          <div class="muted" v-if="selectedItems.length">
            Tổng món chọn thêm: <strong>{{ selectedItems.length }}</strong>
          </div>
          <el-button
            type="primary"
            size="large"
            :disabled="!selectedItems.length || orderSubmitting"
            :loading="orderSubmitting"
            @click="submitOrder"
          >
            Gửi món đã chọn
          </el-button>
        </div>
      </section>

      <section v-if="bankQrRaw" class="card bank-card">
        <h3 class="bank-title">QR ngân hàng</h3>
        <p class="muted">Quét bằng app ngân hàng sẽ tự điền sẵn số tiền và nội dung chuyển khoản.</p>
        <div class="qr-image-wrap">
          <img v-if="bankQrDataUrl" :src="bankQrDataUrl" alt="Bank QR" class="qr-image" />
        </div>
        <div class="bill-total">
          <span>Số tiền</span>
          <strong>{{ formatCurrency(bankAmount) }}</strong>
        </div>
        <div class="payment-code">
          <span>Nội dung CK</span>
          <strong>{{ paymentCode }}</strong>
        </div>
        <div class="payment-waiting" :class="{ paid: paymentStatus === 'succeeded' }">
          {{
            paymentStatus === "succeeded"
              ? "Đã nhận thanh toán. Cảm ơn quý khách!"
              : "Sau khi chuyển khoản, hệ thống sẽ tự xác nhận trong vài giây."
          }}
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import QRCode from "qrcode";
import { ElMessage } from "element-plus";
import { API_ORIGIN } from "@/config/api";

const API_BASE = API_ORIGIN;
const DEFAULT_DISH_IMAGE =
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";

const route = useRoute();

const loading = ref(false);
const error = ref("");
const tableInfo = ref(null);
const bill = ref(null);
const billLoading = ref(false);
const menuItems = ref([]);
const menuLoading = ref(false);
const orderQuantities = ref({});
const orderSubmitting = ref(false);
const bankLoading = ref(false);
const bankQrRaw = ref("");
const bankQrDataUrl = ref("");
const bankAmount = ref(0);
const paymentOrderId = ref(null);
const paymentCode = ref("");
const paymentStatus = ref("");
let paymentStatusTimer = null;
let billRefreshTimer = null;

const token = route.params.token;

const fetchAll = async () => {
  loading.value = true;
  error.value = "";
  try {
    const tRes = await axios.get(`${API_BASE}/api/public/tables/by-token/${token}`);
    tableInfo.value = tRes.data || null;
    await Promise.all([refreshBill(), loadMenu()]);
  } catch (err) {
    console.error(err);
    error.value =
      err.response?.data?.message || "Không thể tải thông tin bàn. Vui lòng thử lại.";
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await fetchAll();
  billRefreshTimer = setInterval(refreshBill, 8000);
});
onUnmounted(() => {
  stopPaymentPolling();
  if (billRefreshTimer) clearInterval(billRefreshTimer);
});

const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return n.toLocaleString("vi-VN") + " đ";
};

const getDishPrice = (item) => Number(item?.display_price ?? item?.sale_price ?? item?.price ?? 0);

const selectedItems = computed(() =>
  menuItems.value
    .map((item) => ({
      item_id: item.item_id,
      quantity: Number(orderQuantities.value[item.item_id] || 0),
    }))
    .filter((item) => item.quantity > 0)
);

const refreshBill = async () => {
  billLoading.value = true;
  try {
    const res = await axios.get(`${API_BASE}/api/public/tables/by-token/${token}/bill`);
    bill.value = res.data || null;
  } catch (err) {
    if (err.response?.status !== 404) console.error(err);
    bill.value = null;
  } finally {
    billLoading.value = false;
  }
};

const loadMenu = async () => {
  const branchId = tableInfo.value?.branch_id || 1;
  menuLoading.value = true;
  try {
    const res = await axios.get(`${API_BASE}/api/menu-items`, {
      params: { page: 1, limit: 200, branch_id: branchId },
    });
    menuItems.value = res.data?.items || [];
    for (const item of menuItems.value) {
      if (orderQuantities.value[item.item_id] == null) {
        orderQuantities.value[item.item_id] = 0;
      }
    }
  } catch (err) {
    console.error(err);
    ElMessage.error("Không thể tải thực đơn.");
  } finally {
    menuLoading.value = false;
  }
};

const resetSelectedItems = () => {
  for (const item of menuItems.value) {
    orderQuantities.value[item.item_id] = 0;
  }
};

const submitOrder = async () => {
  if (!selectedItems.value.length) {
    ElMessage.warning("Chọn ít nhất một món.");
    return;
  }

  orderSubmitting.value = true;
  try {
    const res = await axios.post(`${API_BASE}/api/public/tables/by-token/${token}/orders`, {
      items: selectedItems.value,
    });
    bill.value = res.data?.bill || bill.value;
    resetSelectedItems();
    ElMessage.success("Đã gửi món cho nhà hàng.");
    await refreshBill();
  } catch (err) {
    console.error(err);
    ElMessage.error(err.response?.data?.message || "Không thể gửi món.");
  } finally {
    orderSubmitting.value = false;
  }
};

const stopPaymentPolling = () => {
  if (paymentStatusTimer) {
    clearInterval(paymentStatusTimer);
    paymentStatusTimer = null;
  }
};

const pollPaymentStatus = async () => {
  if (!paymentOrderId.value) return;
  try {
    const res = await axios.get(`${API_BASE}/api/payments/by-order/${paymentOrderId.value}`);
    paymentStatus.value = res.data?.status || "";
    if (paymentStatus.value === "succeeded") {
      stopPaymentPolling();
      ElMessage.success("Thanh toán thành công!");
      await fetchAll();
    }
  } catch (err) {
    console.error(err);
  }
};

const startPaymentPolling = () => {
  stopPaymentPolling();
  pollPaymentStatus();
  paymentStatusTimer = setInterval(pollPaymentStatus, 3000);
};

const genBankQr = async () => {
  bankLoading.value = true;
  bankQrRaw.value = "";
  bankQrDataUrl.value = "";
  bankAmount.value = 0;
  paymentOrderId.value = null;
  paymentCode.value = "";
  paymentStatus.value = "";
  stopPaymentPolling();
  try {
    const res = await axios.post(`${API_BASE}/api/payments/vietqr`, { tableToken: token });
    bankQrRaw.value = res.data?.vietqrRaw || "";
    bankAmount.value = res.data?.amount || 0;
    paymentOrderId.value = res.data?.orderId || null;
    paymentCode.value = res.data?.vietqrContent || res.data?.paymentCode || "";
    if (bankQrRaw.value) {
      bankQrDataUrl.value = await QRCode.toDataURL(bankQrRaw.value, { margin: 1, width: 260 });
      startPaymentPolling();
    }
  } catch (err) {
    console.error(err);
    const msg = err.response?.data?.error || "Không thể tạo QR ngân hàng.";
    ElMessage.error(msg);
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
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-lg);
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
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--hl-space-md);
  margin-bottom: var(--hl-space-md);
}
.section-head h2 {
  margin: 0;
  color: var(--hl-primary);
  font-size: 1.15rem;
}
.selected-count {
  padding: 6px 10px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 999px;
  font-size: 0.85rem;
  white-space: nowrap;
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
.menu-list {
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-sm);
}
.menu-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 116px;
  gap: var(--hl-space-md);
  align-items: center;
  padding: 10px;
  border: 1px solid var(--hl-border-light);
  border-radius: var(--hl-radius-lg);
  background: #fff;
}
.menu-image {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--hl-radius-md);
}
.menu-info h3 {
  margin: 0 0 4px;
  color: var(--hl-text);
  font-size: 0.98rem;
}
.menu-info p {
  margin: 0 0 6px;
  color: var(--hl-text-muted);
  font-size: 0.85rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.menu-info strong {
  color: var(--hl-primary);
}
.qty {
  width: 116px;
}
.submit-order-bar {
  position: sticky;
  bottom: 10px;
  z-index: 2;
  margin-top: var(--hl-space-lg);
  padding: var(--hl-space-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hl-space-md);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--hl-border-light);
  border-radius: var(--hl-radius-lg);
  backdrop-filter: blur(10px);
}
.payment-code {
  margin-top: 10px;
  padding: 10px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: var(--hl-radius-md);
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.payment-code span {
  color: var(--hl-text-muted);
}
.payment-waiting {
  margin-top: 12px;
  padding: 10px 12px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--hl-radius-md);
}
.payment-waiting.paid {
  color: #166534;
  background: #f0fdf4;
  border-color: #bbf7d0;
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
  .qr-page {
    padding: var(--hl-space-md);
  }

  .card {
    padding: var(--hl-space-md);
  }

  .row {
    grid-template-columns: 1fr;
  }

  .section-head,
  .submit-order-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .menu-item {
    grid-template-columns: 64px minmax(0, 1fr);
    align-items: flex-start;
  }

  .menu-image {
    width: 64px;
    height: 64px;
  }

  .qty {
    grid-column: 1 / -1;
    width: 100%;
  }

  .bill-row,
  .bill-total,
  .payment-code {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .actions .el-button,
  .submit-order-bar .el-button {
    width: 100%;
    margin-left: 0;
  }

  .qr-image {
    width: min(260px, 100%);
    height: auto;
    aspect-ratio: 1;
  }
}
</style>

