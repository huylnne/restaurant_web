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
import { ref, onMounted } from "vue";
import { Refresh } from "@element-plus/icons-vue";

const API = "http://localhost:3000/api/auth";

const loading = ref(true);
const errorMessage = ref("");

const captchaId = ref("");
const captchaQuestion = ref("");
const captchaImage = ref("");
const captchaAnswer = ref("");

const emit = defineEmits(["update:valid"]);

function emitChange() {
  emit("update:valid", isReady());
}

function isReady() {
  return !!captchaId.value && String(captchaAnswer.value).trim().length > 0;
}

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

function getPayload() {
  return {
    captcha_id: captchaId.value,
    captcha_answer: captchaAnswer.value,
  };
}

async function reset() {
  await loadChallenge();
  emitChange();
}

onMounted(async () => {
  try {
    await loadChallenge();
  } catch (e) {
    errorMessage.value = e.message || "Lỗi CAPTCHA";
  } finally {
    loading.value = false;
  }
});

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
  margin-top: var(--hl-space-sm);
  padding: var(--hl-space-sm) var(--hl-space-md);
  border: 1px solid var(--hl-border);
  border-radius: var(--hl-radius-sm);
  background: var(--hl-bg-input);
  color: var(--hl-text);
  box-sizing: border-box;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
}

.captcha-image {
  width: 150px;
  height: 48px;
  border: 1px solid var(--hl-border);
  border-radius: var(--hl-radius-sm);
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
</style>
