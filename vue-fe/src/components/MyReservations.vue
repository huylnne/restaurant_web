<template>
  <el-card>
    <h2 class="title">Lịch sử dùng bữa</h2>
    <el-table :data="reservations" v-loading="loading" style="width: 100%">
      <el-table-column prop="reservation_time" label="Thời gian" width="200">
        <template #default="{ row }">
          {{ new Date(row.reservation_time).toLocaleString("vi-VN") }}
        </template>
      </el-table-column>

      <el-table-column prop="number_of_guests" label="Số khách" width="100" />
      <el-table-column label="Bàn số" width="120">
        <template #default="{ row }">
          {{ formatTableNumber(row) }}
        </template>
      </el-table-column>
      <el-table-column prop="Table.capacity" label="Sức chứa" />
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
          <div v-if="row.Orders?.length">
            <div v-for="order in row.Orders" :key="order.order_id" class="order-items">
              <div
                v-for="item in order.OrderItems"
                :key="item.order_item_id"
                class="order-item"
              >
                🍽️ {{ item.MenuItem?.name }} <strong>(x{{ item.quantity }})</strong>
              </div>
            </div>
            <!-- 💰 Hoá đơn tạm tính -->
            <div class="invoice">
              💰 <strong>Tạm tính:</strong>
              {{
                calculateSubtotal(row.Orders).toLocaleString("vi-VN", {
                  style: "currency",
                  currency: "VND",
                })
              }}
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
            @click="cancelReservation(row.reservation_id)"
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
import { ref, onMounted } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { normalizeTableStatus, getTableStatusLabel } from "@/constants/tableStatus";

const reservations = ref([]);
const loading = ref(true);
const reviewDialogVisible = ref(false);
const submittingReview = ref(false);
const reviewForm = ref({
  reservation_id: null,
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

function calculateSubtotal(orders) {
  if (!orders || !Array.isArray(orders)) return 0;

  return orders.reduce((sum, order) => {
    return (
      sum +
      order.OrderItems.reduce((orderSum, item) => {
        const price = Number(item.MenuItem?.price || 0);
        const quantity = Number(item.quantity || 0);
        return orderSum + price * quantity;
      }, 0)
    );
  }, 0);
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
  if (tableStatus === "pre-ordered") return "Đã đặt trước";
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
    reservation_id: row.reservation_id,
    rating: 0,
    comment: "",
  };
  reviewDialogVisible.value = true;
}

async function submitReview() {
  const payload = {
    reservation_id: reviewForm.value.reservation_id,
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

function formatTableNumber(row) {
  const tableNumber = row?.Table?.table_number;
  if (tableNumber === null || tableNumber === undefined || tableNumber === "") {
    return "-";
  }
  return `B${tableNumber}`;
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
  font-weight: 600;
  font-size: 14px;
  color: var(--hl-success);
  border-top: 1px dashed var(--hl-border);
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

:deep(.el-card) {
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  border: 1px solid var(--hl-border-light);
}
</style>
