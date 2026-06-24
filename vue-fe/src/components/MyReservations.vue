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
      <el-table-column prop="note" label="Ghi chú" min-width="140" show-overflow-tooltip />

      <el-table-column label="Hóa đơn" width="148" fixed="right">
        <template #default="{ row }">
          <div v-if="hasRowBill(row)" class="bill-compact">
            <div class="bill-compact__count">{{ getRowItemCount(row) }} món</div>
            <div class="bill-compact__total">{{ formatBillMoney(getRowBill(row).total_amount) }}</div>
            <div
              v-if="getRowBill(row).discount_total > 0"
              class="bill-compact__discount"
            >
              Giảm {{ formatBillMoney(getRowBill(row).discount_total) }}
            </div>
            <router-link :to="getReservationBillRoute(row)" class="bill-compact__link">
              Xem chi tiết
            </router-link>
          </div>
          <span v-else class="bill-compact__empty">Chưa có món</span>
        </template>
      </el-table-column>

      <el-table-column label="Hành động" width="160" fixed="right">
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
            <strong>{{ formatBillMoney(getRowBill(row).total_amount) }}</strong>
          </div>
        </div>

        <div v-if="row.Branch?.address" class="reservation-mobile-card__note">
          {{ row.Branch.address }}
        </div>
        <div v-if="row.note" class="reservation-mobile-card__note">
          Ghi chú: {{ row.note }}
        </div>

        <div v-if="hasRowBill(row)" class="reservation-mobile-card__bill">
          <div class="bill-compact bill-compact--mobile">
            <div>
              <span class="bill-compact__count">{{ getRowItemCount(row) }} món</span>
              <strong class="bill-compact__total">{{ formatBillMoney(getRowBill(row).total_amount) }}</strong>
              <div
                v-if="getRowBill(row).discount_total > 0"
                class="bill-compact__discount"
              >
                Giảm {{ formatBillMoney(getRowBill(row).discount_total) }}
              </div>
            </div>
            <router-link :to="getReservationBillRoute(row)" class="bill-compact__btn">
              Xem hóa đơn
            </router-link>
          </div>
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
import {
  formatRestaurantNameFromRow,
  formatBranchNameFromRow,
  formatBranchTooltipFromRow,
} from "@/utils/branchDisplay";
import {
  groupReservationsForDisplay,
  getRowBill,
  hasRowBill,
  getRowItemCount,
  formatBillMoney,
  getReservationBillRoute,
  getDiningStatusLabel,
  formatCapacity,
  formatTableNumber,
} from "@/utils/reservationDisplay";

const reservations = ref([]);
const loading = ref(true);

/** Gộp các bản ghi cùng booking_group_id thành một dòng hiển thị */
const displayReservations = computed(() => groupReservationsForDisplay(reservations.value));

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

function canCancelReservation(row) {
  const resStatus = (row.status || "").trim().toLowerCase();
  if (!["pending", "confirmed"].includes(resStatus)) return false;
  if (row.checked_in_at) return false;
  const arrivalMs = new Date(row.arrival_time).getTime();
  if (!Number.isFinite(arrivalMs)) return false;
  return arrivalMs - Date.now() >= 2 * 60 * 60 * 1000;
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
}

.bill-compact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
}

.bill-compact__count {
  font-size: 12px;
  color: var(--hl-text-muted);
}

.bill-compact__total {
  font-size: 14px;
  font-weight: 700;
  color: var(--hl-text);
}

.bill-compact__discount {
  font-size: 12px;
  color: #16a34a;
  font-weight: 500;
}

.bill-compact__link {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hl-primary);
  text-decoration: none;
}

.bill-compact__link:hover {
  text-decoration: underline;
}

.bill-compact__empty {
  font-size: 13px;
  color: var(--hl-text-muted);
}

.bill-compact--mobile {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--hl-space-sm);
  padding: var(--hl-space-sm);
  border-radius: var(--hl-radius-md);
  background: var(--hl-bg-muted);
}

.bill-compact__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: var(--hl-radius-md);
  background: var(--hl-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.bill-compact__btn--inline {
  flex: 1 1 120px;
}

.reservation-mobile-card__bill {
  margin-top: var(--hl-space-md);
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
  min-width: 960px;
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
