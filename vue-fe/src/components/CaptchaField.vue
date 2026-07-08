<template>
  <div class="captcha-field">
    <label v-if="!loading" class="captcha-label">Nhập mã xác minh</label>

    <div v-if="loading" class="captcha-loading">Đang tải CAPTCHA...</div>

    <template v-else>
      <div class="captcha-code">
        <div class="captcha-row">
          <img v-if="captchaImage" :src="captchaImage" alt="Mã CAPTCHA" class="captcha-image" />
          <span v-else class="captcha-question">{{ captchaQuestion || "..." }}</span>
          <el-button type="default" size="small" :icon="Refresh" circle @click="loadChallenge" />
        </div>
        <input
          v-model="captchaAnswer"
          type="text"
          inputmode="text"
          placeholder="Nhập mã CAPTCHA"
          autocomplete="off"
          @input="emitChange"
        />
      </div>
    </template>

    <p v-if="errorMessage" class="captcha-error">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
// CaptchaField — ô nhập CAPTCHA: tự lấy thử thách từ BE (ảnh hoặc câu hỏi) và cho phép làm mới.
// Component cha lấy dữ liệu để gửi qua ref (getPayload) và theo dõi tính hợp lệ qua sự kiện update:valid.
import { ref, onMounted } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { apiUrl } from "@/config/api";

const API = apiUrl("/api/auth");

const loading = ref(true);       // đang tải thử thách lần đầu
const errorMessage = ref("");    // thông báo lỗi (nếu có)

const captchaId = ref("");       // id thử thách (gửi kèm khi submit để BE đối chiếu)
const captchaQuestion = ref(""); // câu hỏi dạng text (nếu BE trả về text thay vì ảnh)
const captchaImage = ref("");    // ảnh CAPTCHA dạng data URL
const captchaAnswer = ref("");   // đáp án người dùng nhập

const emit = defineEmits(["update:valid"]);

// Mỗi khi người dùng gõ hoặc tải lại thử thách → báo cha biết trường đã hợp lệ hay chưa.
function emitChange() {
  emit("update:valid", isReady());
}

// Hợp lệ khi: có id thử thách và người dùng đã nhập đáp án (khác rỗng).
function isReady() {
  return !!captchaId.value && String(captchaAnswer.value).trim().length > 0;
}

// Lấy 1 thử thách CAPTCHA mới từ BE; xóa đáp án cũ trước khi nạp.
async function loadChallenge() {
  captchaAnswer.value = "";
  captchaImage.value = "";
  captchaQuestion.value = "";
  const res = await fetch(`${API}/captcha-challenge`);
  if (!res.ok) {
    errorMessage.value = "Không tải được CAPTCHA";
    return;
  }
  const data = await res.json();
  captchaId.value = data.captchaId;
  captchaImage.value = data.imageData || "";
  captchaQuestion.value = data.question || "";
  emitChange();
}

// Dữ liệu cha cần đính kèm khi submit form (id + đáp án).
function getPayload() {
  return {
    captcha_id: captchaId.value,
    captcha_answer: captchaAnswer.value,
  };
}

// Đặt lại: tải thử thách mới (dùng sau khi submit thất bại vì CAPTCHA hết hạn/sai).
async function reset() {
  await loadChallenge();
  emitChange();
}

// Tải thử thách đầu tiên khi component xuất hiện.
onMounted(async () => {
  try {
    await loadChallenge();
  } catch (e) {
    errorMessage.value = e.message || "Lỗi CAPTCHA";
  } finally {
    loading.value = false;
  }
});

// Cho phép component cha gọi getPayload/isReady/reset qua template ref.
defineExpose({ getPayload, isReady, reset });
</script>

<style scoped>
.captcha-field {
  display: block;
  margin-bottom: var(--hl-space-md);
}

.captcha-label {
  display: block;
  font-size: 14px;
  color: var(--hl-text);
  margin-bottom: var(--hl-space-xs);
}

.captcha-loading {
  font-size: 14px;
  color: var(--hl-text-light);
}

.captcha-code input {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: var(--hl-space-sm);
  padding: 11px 16px;
  border: 1px solid var(--hl-border);
  border-radius: var(--hl-radius-sm);
  background: var(--hl-bg-input);
  color: var(--hl-text);
  font-size: 1rem;
  line-height: 1.5;
  box-sizing: border-box;
}

.captcha-code input:focus {
  outline: none;
  border-color: var(--hl-primary);
  box-shadow: 0 0 0 2px var(--hl-primary-bg);
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
  min-width: 0;
}

.captcha-image {
  width: min(150px, 100%);
  height: 48px;
  border: 1px solid var(--hl-border);
  border-radius: var(--hl-radius-sm);
  object-fit: contain;
}

.captcha-question {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--hl-primary);
}

.captcha-error {
  margin-top: var(--hl-space-xs);
  color: var(--hl-error);
  font-size: 14px;
}

@media (max-width: 360px) {
  .captcha-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .captcha-image {
    width: 100%;
    max-width: 180px;
  }
}
</style>
