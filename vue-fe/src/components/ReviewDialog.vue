<template>
  <el-dialog
    :model-value="modelValue"
    title="Đánh giá chất lượng dịch vụ"
    width="min(520px, 92vw)"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <p class="review-intro">Cảm ơn quý khách đã dùng bữa. Xin vui lòng chia sẻ trải nghiệm của bạn.</p>
    <div class="review-form">
      <div class="review-label">Số sao</div>
      <el-rate v-model="form.rating" show-score text-color="#ff9900" />

      <div class="review-label review-label-space">Nội dung nhận xét</div>
      <el-input
        v-model="form.comment"
        type="textarea"
        :rows="4"
        maxlength="1000"
        show-word-limit
        placeholder="Chia sẻ trải nghiệm của bạn (tối thiểu 5 ký tự)"
      />
    </div>

    <template #footer>
      <el-button @click="handleClose">Để sau</el-button>
      <el-button type="primary" :loading="submitting" @click="submitReview">
        Gửi đánh giá
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// ReviewDialog — hộp thoại đánh giá dịch vụ sau khi dùng bữa (chọn sao + nhận xét).
// Hỗ trợ 2 chế độ: "auth" (khách đã đăng nhập) và "guest" (khách quét QR bàn, dùng tableToken).
import { ref, watch } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { API_ORIGIN } from "@/config/api";

const props = defineProps({
  modelValue: { type: Boolean, default: false },       // đóng/mở dialog (v-model)
  orderId: { type: [Number, String], default: null },  // đơn cần đánh giá
  mode: {
    type: String,
    default: "auth",
    validator: (value) => ["auth", "guest"].includes(value), // chỉ nhận 2 chế độ
  },
  tableToken: { type: String, default: "" },           // token bàn (bắt buộc ở chế độ guest)
});

const emit = defineEmits(["update:modelValue", "submitted", "closed"]);

const form = ref({ rating: 0, comment: "" });
const submitting = ref(false);

// Mỗi lần mở dialog → reset form về trống để không giữ đánh giá cũ.
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.value = { rating: 0, comment: "" };
    }
  }
);

// Đóng dialog ("Để sau"/nút X): tắt v-model và báo cha đã đóng (kèm orderId).
function handleClose() {
  emit("update:modelValue", false);
  emit("closed", { orderId: props.orderId });
}

// Gửi đánh giá: validate ở client trước rồi mới gọi API (endpoint khác nhau theo mode).
async function submitReview() {
  const payload = {
    order_id: Number(props.orderId),
    rating: Number(form.value.rating),
    comment: String(form.value.comment || "").trim(),
  };

  // Các kiểm tra bắt buộc trước khi gửi.
  if (!payload.order_id) {
    ElMessage.warning("Không xác định được đơn hàng để đánh giá");
    return;
  }
  if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
    ElMessage.warning("Vui lòng chọn số sao từ 1 đến 5");
    return;
  }
  if (payload.comment.length < 5) {
    ElMessage.warning("Nội dung đánh giá tối thiểu 5 ký tự");
    return;
  }

  submitting.value = true;
  try {
    if (props.mode === "guest") {
      // Khách vãng lai: gửi qua endpoint public theo token bàn (không cần đăng nhập).
      await axios.post(
        `${API_ORIGIN}/api/public/tables/by-token/${props.tableToken}/reviews`,
        payload
      );
    } else {
      // Khách đã đăng nhập: gửi kèm JWT.
      const token = localStorage.getItem("token");
      await axios.post("/api/users/reviews", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    ElMessage.success("Gửi đánh giá thành công. Cảm ơn quý khách!");
    emit("update:modelValue", false);
    emit("submitted", { orderId: payload.order_id }); // báo cha để cập nhật UI
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Không thể gửi đánh giá");
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.review-intro {
  margin: 0 0 12px;
  color: var(--hl-text-muted);
  line-height: 1.5;
}
.review-form {
  display: flex;
  flex-direction: column;
}
.review-label {
  font-size: 0.9rem;
  color: var(--hl-text);
  font-weight: 600;
}
.review-label-space {
  margin-top: 16px;
  margin-bottom: 8px;
}
</style>
