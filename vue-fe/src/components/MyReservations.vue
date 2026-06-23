<template>
  <el-card class="reservations-card">
    <h2 class="title">Lịch sử dùng bữa</h2>
    <div class="reservations-table-wrap">
      <el-table :data="displayReservations" v-loading="loading" class="reservations-table">
        <el-table-column prop="arrival_time" label="Thời gian" width="200">
          <template #default="{ row }">
            {{ new Date(row.arrival_time).toLocaleString("vi-VN") }}
          </template>
        </el-table-column>

      <el-table-column label="Nhà hàng" min-width="160">
        <template #default="{ row }">
          {{ formatRestaurantName(row) }}
        </template>
      </el-table-column>

      <el-table-column label="Chi nhánh" min-width="200">
        <template #default="{ row }">
          <el-tooltip
            v-if="formatBranchName(row) !== '-'"
            :content="formatBranchTooltip(row)"
            placement="top"
          >
            <div class="branch-cell">
              <div class="branch-name">{{ formatBranchName(row) }}</div>
              <div v-if="row.Branch?.address" class="branch-address">
                {{ row.Branch.address }}
              </div>
            </div>
          </el-tooltip>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column prop="number_of_guests" label="Số khách" width="100" />
      <el-table-column label="Bàn số" width="120">
        <template #default="{ row }">
          {{ formatTableNumber(row) }}
        </template>
      </el-table-column>
      <el-table-column label="Sức chứa">
        <template #default="{ row }">
          {{ formatCapacity(row) }}
        </template>
      </el-table-column>
      <el-table-column label="Trạng thái" width="140">
        <template #default="{ row }">
          {{ getDiningStatusLabel(row) }}
        </template>
      </el-table-column>
      <el-table-column label="Đánh giá" width="220">
        <template #default="{ row }">
          <div v-if="row.Review" class="review-cell">
            <el-rate :model-value="row.Review.rating" disabled show-score text-color="#ff9900" />
            <div class="review-comment">{{ row.Review.comment }}</div>
          </div>
          <span v-else class="review-empty">Chưa đánh giá</span>
        </template>
      </el-table-column>
      <el-table-column prop="note" label="Ghi chú" />

      <!-- Món đã gọi -->
      <el-table-column label="Món đã gọi">
        <template #default="{ row }">
          <div v-if="row.OrderItems?.length || row.Orders?.length">
            <div v-if="row.OrderItems?.length" class="order-items">
              <div
                v-for="item in row.OrderItems"
                :key="item.order_item_id"
                class="order-item"
              >
                🍽️ {{ item.MenuItem?.name }} <strong>(x{{ item.quantity }})</strong>
              </div>
            </div>
            <template v-else>
              <div v-for="order in row.Orders" :key="order.order_id" class="order-items">
                <div
                  v-for="item in order.OrderItems"
                  :key="item.order_item_id"
                  class="order-item"
                >
                  🍽️ {{ item.MenuItem?.name }} <strong>(x{{ item.quantity }})</strong>
                </div>
              </div>
            </template>
            <!-- 💰 Hoá đơn tạm tính (đồng bộ với bill nhân viên) -->
            <div class="invoice">
              <template v-if="getRowDiscountTotal(row) > 0">
                <div class="invoice-row invoice-row--muted">
                  Tạm tính:
                  {{ formatBillMoney(getRowSubtotalBeforeDiscount(row)) }}
                </div>
                <div class="invoice-row invoice-row--discount">
                  Giảm giá:
                  - {{ formatBillMoney(getRowDiscountTotal(row)) }}
                </div>
              </template>
              <div class="invoice-row invoice-row--total">
                💰 <strong>Tổng cộng:</strong>
                {{ formatBillMoney(getRowBillTotal(row)) }}
              </div>
            </div>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <!-- ❌ Hủy đặt bàn: chỉ khi bàn vẫn là "Đã đặt trước", chưa chuyển sang Đang phục vụ -->
        <el-table-column label="Hành động" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="canCancelReservation(row)"
              type="danger"
              size="small"
              @click="cancelReservation(row.order_id)"
            >
              Hủy
            </el-button>
            <el-button
              v-if="canReviewReservation(row)"
              type="warning"
              size="small"
              @click="openReviewDialog(row)"
            >
              Đánh giá
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-loading="loading" class="reservations-mobile-list">
      <div v-if="!loading && !displayReservations.length" class="reservations-empty">
        Chưa có lịch sử dùng bữa.
      </div>
      <article
        v-for="row in displayReservations"
        :key="row.order_id || row.booking_group_id"
        class="reservation-mobile-card"
      >
        <div class="reservation-mobile-card__header">
          <div>
            <div class="reservation-mobile-card__time">
              {{ new Date(row.arrival_time).toLocaleString("vi-VN") }}
            </div>
            <div class="reservation-mobile-card__restaurant">
              {{ formatRestaurantName(row) }}
            </div>
            <div class="reservation-mobile-card__branch">
              {{ formatBranchName(row) }}
            </div>
          </div>
          <span class="reservation-mobile-card__status">
            {{ getDiningStatusLabel(row) }}
          </span>
        </div>

        <div class="reservation-mobile-card__grid">
          <div>
            <span>Số khách</span>
            <strong>{{ row.number_of_guests ?? "-" }}</strong>
          </div>
          <div>
            <span>Bàn</span>
            <strong>{{ formatTableNumber(row) }}</strong>
          </div>
          <div>
            <span>Sức chứa</span>
            <strong>{{ formatCapacity(row) }}</strong>
          </div>
          <div>
            <span>Tổng cộng</span>
            <strong>{{ formatBillMoney(getRowBillTotal(row)) }}</strong>
          </div>
        </div>

        <div v-if="row.Branch?.address" class="reservation-mobile-card__note">
          {{ row.Branch.address }}
        </div>
        <div v-if="row.note" class="reservation-mobile-card__note">
          Ghi chú: {{ row.note }}
        </div>

        <div v-if="row.OrderItems?.length || row.Orders?.length" class="reservation-mobile-card__items">
          <strong>Món đã gọi</strong>
          <div v-if="row.OrderItems?.length" class="order-items">
            <div v-for="item in row.OrderItems" :key="item.order_item_id" class="order-item">
              {{ item.MenuItem?.name }} <strong>(x{{ item.quantity }})</strong>
            </div>
          </div>
          <template v-else>
            <div v-for="order in row.Orders" :key="order.order_id" class="order-items">
              <div v-for="item in order.OrderItems" :key="item.order_item_id" class="order-item">
                {{ item.MenuItem?.name }} <strong>(x{{ item.quantity }})</strong>
              </div>
            </div>
          </template>
        </div>

        <div v-if="row.Review" class="reservation-mobile-card__review">
          <el-rate :model-value="row.Review.rating" disabled show-score text-color="#ff9900" />
          <div class="review-comment">{{ row.Review.comment }}</div>
        </div>

        <div
          v-if="canCancelReservation(row) || canReviewReservation(row)"
          class="reservation-mobile-card__actions"
        >
          <el-button
            v-if="canCancelReservation(row)"
            type="danger"
            size="small"
            @click="cancelReservation(row.order_id)"
          >
            Hủy
          </el-button>
          <el-button
            v-if="canReviewReservation(row)"
            type="warning"
            size="small"
            @click="openReviewDialog(row)"
          >
            Đánh giá
          </el-button>
        </div>
      </article>
    </div>

    <el-dialog v-model="reviewDialogVisible" title="Đánh giá chất lượng dịch vụ" width="520px">
      <div class="review-form">
        <div class="review-label">Số sao</div>
        <el-rate v-model="reviewForm.rating" show-score text-color="#ff9900" />

        <div class="review-label review-label-space">Nội dung nhận xét</div>
        <el-input
          v-model="reviewForm.comment"
          type="textarea"
          :rows="4"
          maxlength="1000"
          show-word-limit
          placeholder="Chia sẻ trải nghiệm của bạn..."
        />
      </div>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">Hủy</el-button>
        <el-button type="primary" :loading="submittingReview" @click="submitReview">
          Gửi đánh giá
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { normalizeTableStatus, getTableStatusLabel } from "@/constants/tableStatus";
import {
  formatRestaurantNameFromRow,
  formatBranchNameFromRow,
  formatBranchTooltipFromRow,
} from "@/utils/branchDisplay";

const reservations = ref([]);
const loading = ref(true);

/** Gộp các bản ghi cùng booking_group_id thành một dòng hiển thị */
const displayReservations = computed(() => groupReservationsForDisplay(reservations.value));

function groupReservationsForDisplay(rows) {
  if (!rows?.length) return [];
  const seen = new Set();
  const result = [];

  for (const row of rows) {
    if (row.tables?.length) {
      result.push({
        ...row,
        groupTables: row.tables,
        groupOrderIds: [row.order_id],
      });
      continue;
    }

    const gid = row.booking_group_id;
    if (!gid) {
      result.push(row);
      continue;
    }
    if (seen.has(gid)) continue;
    seen.add(gid);

    const group = rows.filter((r) => r.booking_group_id === gid);
    const tables = group.map((r) => r.Table).filter(Boolean);
    const primary = group.reduce((a, b) => (a.order_id < b.order_id ? a : b));
    const mergedOrderItems = group.flatMap((r) => r.OrderItems || []);
    result.push({
      ...primary,
      OrderItems: mergedOrderItems,
      groupTables: tables,
      groupOrderIds: group.map((r) => r.order_id),
      subtotal_before_discount: group.reduce(
        (s, r) => s + Number(r.subtotal_before_discount || 0),
        0
      ),
      discount_total: group.reduce((s, r) => s + Number(r.discount_total || 0), 0),
      bill_total: group.reduce((s, r) => s + Number(r.bill_total || 0), 0),
    });
  }

  return result.sort((a, b) => new Date(b.arrival_time) - new Date(a.arrival_time));
}
const reviewDialogVisible = ref(false);
const submittingReview = ref(false);
const reviewForm = ref({
  order_id: null,
  rating: 0,
  comment: "",
});

async function fetchReservations() {
  try {
    loading.value = true;
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/users/reservations", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    reservations.value = res.data.reservations || res.data;
  } catch (err) {
    console.error("Lỗi khi lấy reservations:", err);
    ElMessage.error(err.response?.data?.message || "Lỗi tải dữ liệu");
  } finally {
    loading.value = false;
  }
}

async function cancelReservation(id) {
  try {
    await ElMessageBox.confirm("Bạn có chắc chắn muốn hủy đặt bàn này?", "Xác nhận hủy", {
      confirmButtonText: "Hủy bàn",
      cancelButtonText: "Không",
      type: "warning",
    });
    const token = localStorage.getItem("token");
    await axios.put(
      `/api/reservations/${id}/cancel`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    ElMessage.success("Hủy đặt bàn thành công");
    fetchReservations();
  } catch (err) {
    if (err !== "cancel") {
      ElMessage.error(err.response?.data?.message || "Lỗi khi hủy đặt bàn");
    }
  }
}

function formatBillMoney(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

function getRowBillTotal(row) {
  if (row?.bill_total != null) return Number(row.bill_total) || 0;
  return calculateRowSubtotal(row);
}

function getRowSubtotalBeforeDiscount(row) {
  if (row?.subtotal_before_discount != null) {
    return Number(row.subtotal_before_discount) || 0;
  }
  return getRowBillTotal(row);
}

function getRowDiscountTotal(row) {
  return Number(row?.discount_total) || 0;
}

function calculateItemsSubtotal(items) {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const menu = item.MenuItem;
    const price = Number(item.price ?? menu?.price ?? 0);
    const quantity = Number(item.quantity || 0);
    return sum + price * quantity;
  }, 0);
}

function calculateRowSubtotal(row) {
  if (row?.OrderItems?.length) return calculateItemsSubtotal(row.OrderItems);
  if (!row?.Orders || !Array.isArray(row.Orders)) return 0;
  return row.Orders.reduce(
    (sum, order) => sum + calculateItemsSubtotal(order.OrderItems),
    0
  );
}

/** Trạng thái dùng bữa đồng bộ với bàn (admin/waiter cập nhật trạng thái bàn → user thấy ngay) */
/** Chỉ cho hủy khi: đặt bàn đã xác nhận/pending VÀ bàn vẫn trạng thái "Đã đặt trước" (chưa chuyển Đang phục vụ) */
function canCancelReservation(row) {
  const resStatus = (row.status || "").trim().toLowerCase();
  const tableStatus = normalizeTableStatus(row.Table?.status);
  if (!["pending", "confirmed"].includes(resStatus)) return false;
  return tableStatus === "pre-ordered";
}

function getDiningStatusLabel(row) {
  const resStatus = (row.status || "").trim().toLowerCase();
  const tableStatus = normalizeTableStatus(row.Table?.status);

  if (resStatus === "cancelled") return "Đã hủy";
  if (resStatus === "completed") return "Đã xong";
  if (resStatus === "pending") return "Chờ xác nhận";
  if (resStatus === "waiting_payment") return "Chờ thanh toán";

  if (tableStatus === "occupied") return "Đang phục vụ";
  if (tableStatus === "pre-ordered") return "Đã đặt";
  if (tableStatus === "cleaning") return "Chờ dọn";
  if (resStatus === "confirmed") return "Đã xác nhận";

  return getTableStatusLabel(row.Table?.status) || row.status || "-";
}

function canReviewReservation(row) {
  const reservationStatus = String(row.status || "").trim().toLowerCase();
  const paymentStatus = String(row.Payment?.status || "").trim().toLowerCase();
  const isEligible = reservationStatus === "completed" || paymentStatus === "succeeded";
  return isEligible && !row.Review;
}

function openReviewDialog(row) {
  reviewForm.value = {
    order_id: row.order_id,
    rating: 0,
    comment: "",
  };
  reviewDialogVisible.value = true;
}

async function submitReview() {
  const payload = {
    order_id: reviewForm.value.order_id,
    rating: Number(reviewForm.value.rating),
    comment: String(reviewForm.value.comment || "").trim(),
  };

  if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
    ElMessage.warning("Vui lòng chọn số sao từ 1 đến 5");
    return;
  }
  if (payload.comment.length < 5) {
    ElMessage.warning("Nội dung đánh giá tối thiểu 5 ký tự");
    return;
  }

  try {
    submittingReview.value = true;
    const token = localStorage.getItem("token");
    await axios.post("/api/users/reviews", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    ElMessage.success("Gửi đánh giá thành công");
    reviewDialogVisible.value = false;
    await fetchReservations();
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Không thể gửi đánh giá");
  } finally {
    submittingReview.value = false;
  }
}

function formatCapacity(row) {
  if (row?.groupTables?.length) {
    const total = row.groupTables.reduce((s, t) => s + Number(t.capacity || 0), 0);
    return `${total} (${row.groupTables.length} bàn)`;
  }
  return row?.Table?.capacity ?? "-";
}

function formatTableNumber(row) {
  if (row?.groupTables?.length) {
    return row.groupTables
      .map((t) => t.table_number)
      .filter((n) => n != null && n !== "")
      .sort((a, b) => a - b)
      .map((n) => `B${n}`)
      .join(", ");
  }
  const tableNumber = row?.Table?.table_number;
  if (tableNumber === null || tableNumber === undefined || tableNumber === "") {
    return "-";
  }
  return `B${tableNumber}`;
}

function formatBranchName(row) {
  return formatBranchNameFromRow(row);
}

function formatRestaurantName(row) {
  return formatRestaurantNameFromRow(row);
}

function formatBranchTooltip(row) {
  return formatBranchTooltipFromRow(row);
}

onMounted(fetchReservations);
</script>

<style scoped>
.title {
  font-size: 1.25rem;
  margin-bottom: var(--hl-space-md);
  color: var(--hl-primary);
  font-weight: 600;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-xs);
  padding: var(--hl-space-xs) 0;
}

.order-item {
  font-size: 14px;
  line-height: 1.4;
  color: var(--hl-text-secondary);
}

.invoice {
  margin-top: var(--hl-space-xs);
  padding-top: var(--hl-space-xs);
  font-size: 14px;
  border-top: 1px dashed var(--hl-border);
}

.invoice-row {
  line-height: 1.5;
}

.invoice-row--muted {
  color: var(--hl-text-muted);
}

.invoice-row--discount {
  color: #16a34a;
  font-weight: 500;
}

.invoice-row--total {
  margin-top: 2px;
  font-weight: 600;
  color: var(--hl-success);
}

.review-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.review-comment {
  font-size: 13px;
  color: var(--hl-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-empty {
  color: var(--hl-text-light);
}

.review-form {
  display: flex;
  flex-direction: column;
}

.review-label {
  font-weight: 600;
  color: var(--hl-text);
  margin-bottom: 8px;
}

.review-label-space {
  margin-top: 16px;
}

.reservations-card {
  width: 100%;
}

.reservations-table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.reservations-table {
  width: 100%;
  min-width: 1080px;
}

.reservations-mobile-list {
  display: none;
}

.branch-cell {
  line-height: 1.35;
}

.branch-name {
  font-weight: 600;
  color: var(--hl-text);
  white-space: normal;
  word-break: break-word;
}

.branch-address {
  margin-top: 2px;
  font-size: 12px;
  color: var(--hl-text-muted);
  white-space: normal;
  word-break: break-word;
}

:deep(.el-card) {
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  border: 1px solid var(--hl-border-light);
}

:deep(.reservations-card .el-card__body) {
  width: 100%;
}

@media (max-width: 768px) {
  .title {
    font-size: 1.1rem;
  }

  .reservations-table-wrap {
    display: none;
  }

  .reservations-mobile-list {
    display: flex;
    flex-direction: column;
    gap: var(--hl-space-md);
    min-height: 80px;
  }

  .reservations-empty,
  .reservation-mobile-card {
    border: 1px solid var(--hl-border-light);
    border-radius: var(--hl-radius-lg);
    background: var(--hl-bg-page);
  }

  .reservations-empty {
    padding: var(--hl-space-lg);
    text-align: center;
    color: var(--hl-text-muted);
  }

  .reservation-mobile-card {
    padding: var(--hl-space-md);
    box-shadow: var(--hl-shadow-sm);
  }

  .reservation-mobile-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--hl-space-sm);
    margin-bottom: var(--hl-space-md);
  }

  .reservation-mobile-card__time,
  .reservation-mobile-card__restaurant,
  .reservation-mobile-card__branch {
    font-weight: 600;
    color: var(--hl-text);
  }

  .reservation-mobile-card__restaurant {
    margin-top: 2px;
    font-size: 14px;
    color: var(--hl-primary);
  }

  .reservation-mobile-card__branch {
    margin-top: 2px;
    font-size: 13px;
    color: var(--hl-text-secondary);
  }

  .reservation-mobile-card__status {
    flex: 0 0 auto;
    max-width: 45%;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--hl-primary-bg);
    color: var(--hl-primary);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
  }

  .reservation-mobile-card__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--hl-space-sm);
  }

  .reservation-mobile-card__grid div {
    min-width: 0;
    padding: var(--hl-space-sm);
    border-radius: var(--hl-radius-md);
    background: var(--hl-bg-muted);
  }

  .reservation-mobile-card__grid span {
    display: block;
    margin-bottom: 3px;
    font-size: 12px;
    color: var(--hl-text-muted);
  }

  .reservation-mobile-card__grid strong,
  .reservation-mobile-card__note,
  .reservation-mobile-card__items {
    word-break: break-word;
  }

  .reservation-mobile-card__note,
  .reservation-mobile-card__items,
  .reservation-mobile-card__review,
  .reservation-mobile-card__actions {
    margin-top: var(--hl-space-md);
  }

  .reservation-mobile-card__note {
    font-size: 13px;
    color: var(--hl-text-muted);
  }

  .reservation-mobile-card__items {
    display: flex;
    flex-direction: column;
    gap: var(--hl-space-xs);
  }

  .reservation-mobile-card__actions {
    display: flex;
    gap: var(--hl-space-sm);
    flex-wrap: wrap;
  }

  .reservation-mobile-card__actions .el-button {
    flex: 1 1 120px;
    margin-left: 0;
  }

  :deep(.el-dialog) {
    width: calc(100vw - 32px) !important;
  }
}
</style>
