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

      <el-table-column label="Chi nhánh" min-width="240">
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
            <!-- 💰 Hoá đơn tạm tính -->
            <div class="invoice">
              💰 <strong>Tạm tính:</strong>
              {{
                calculateRowSubtotal(row).toLocaleString("vi-VN", {
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

const reservations = ref([]);
const loading = ref(true);

/** Gộp các bản ghi cùng booking_group_id thành một dòng hiển thị */
const displayReservations = computed(() => groupReservationsForDisplay(reservations.value));

function groupReservationsForDisplay(rows) {
  if (!rows?.length) return [];
  const seen = new Set();
  const result = [];

  for (const row of rows) {
    const gid = row.booking_group_id;
    if (!gid) {
      result.push(row);
      continue;
    }
    if (seen.has(gid)) continue;
    seen.add(gid);

    const group = rows.filter((r) => r.booking_group_id === gid);
    const tables = group.map((r) => r.Table).filter(Boolean);
    const primary = group.reduce((a, b) =>
      a.order_id < b.order_id ? a : b
    );
    result.push({
      ...primary,
      groupTables: tables,
      groupOrderIds: group.map((r) => r.order_id),
    });
  }

  return result.sort(
    (a, b) => new Date(b.arrival_time) - new Date(a.arrival_time)
  );
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

function calculateItemsSubtotal(items) {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const price = Number(item.MenuItem?.price || 0);
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
  const name = row?.Branch?.name;
  if (name) return name;
  if (row?.branch_id) return `Chi nhánh #${row.branch_id}`;
  return "-";
}

function formatBranchTooltip(row) {
  const name = formatBranchName(row);
  const addr = row?.Branch?.address;
  return addr ? `${name}\n${addr}` : name;
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
  min-width: 1280px;
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
</style>
