<template>
  <div class="captcha-field">
    <label v-if="provider === 'math' && !loading" class="captcha-label">Xác minh chống spam</label>

    <div v-if="loading" class="captcha-loading">Đang tải CAPTCHA...</div>

    <template v-else>
      <div v-if="provider === 'math'" class="math-captcha">
        <div class="math-row">
          <span class="math-question">{{ mathQuestion || "..." }}</span>
          <el-button type="default" size="small" :icon="Refresh" circle @click="loadMathChallenge" />
        </div>
        <input
          v-model="mathAnswer"
          type="text"
          inputmode="numeric"
          placeholder="Nhập kết quả"
          autocomplete="off"
          @input="emitChange"
        />
      </div>

      <div
        v-show="provider === 'recaptcha'"
        :id="recaptchaContainerId"
        ref="recaptchaHost"
        class="widget-host"
      />

      <div
        v-show="provider === 'turnstile'"
        :id="turnstileContainerId"
        ref="turnstileHost"
        class="widget-host"
      />
    </template>

    <p v-if="errorMessage" class="captcha-error">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Refresh } from "@element-plus/icons-vue";

const API = "http://localhost:3000/api/auth";

const provider = ref("math");
const siteKey = ref("");
const loading = ref(true);
const errorMessage = ref("");

const captchaId = ref("");
const mathQuestion = ref("");
const mathAnswer = ref("");
const captchaToken = ref("");

const recaptchaHost = ref(null);
const turnstileHost = ref(null);
const recaptchaContainerId = `recaptcha-${Math.random().toString(36).slice(2, 9)}`;
const turnstileContainerId = `turnstile-${Math.random().toString(36).slice(2, 9)}`;

let recaptchaWidgetId = null;
let turnstileWidgetId = null;

const emit = defineEmits(["update:valid"]);

function emitChange() {
  emit("update:valid", isReady());
}

function isReady() {
  if (provider.value === "math") {
    return !!captchaId.value && String(mathAnswer.value).trim().length > 0;
  }
  return !!captchaToken.value;
}

async function loadConfig() {
  const res = await fetch(`${API}/captcha-config`);
  const data = await res.json();
  provider.value = data.provider || "math";
  siteKey.value = data.siteKey || "";
  if (data.provider !== "math" && !data.enabled) {
    errorMessage.value =
      "CAPTCHA bên thứ ba chưa được cấu hình. Server sẽ dùng CAPTCHA phép tính.";
    provider.value = "math";
  }
}

async function loadMathChallenge() {
  mathAnswer.value = "";
  captchaToken.value = "";
  const res = await fetch(`${API}/captcha-challenge`);
  if (!res.ok) {
    errorMessage.value = "Không tải được CAPTCHA";
    return;
  }
  const data = await res.json();
  captchaId.value = data.captchaId;
  mathQuestion.value = data.question;
  emitChange();
}

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.getAttribute("data-loaded") === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Không tải script: ${src}`)), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      s.setAttribute("data-loaded", "1");
      resolve();
    };
    s.onerror = () => reject(new Error(`Không tải script: ${src}`));
    document.head.appendChild(s);
  });
}

function waitForGrecaptcha() {
  return new Promise((resolve) => {
    if (window.grecaptcha?.ready) {
      window.grecaptcha.ready(resolve);
      return;
    }
    const tick = () => {
      if (window.grecaptcha?.ready) window.grecaptcha.ready(resolve);
      else setTimeout(tick, 50);
    };
    tick();
  });
}

function getRenderTarget(hostRef, containerId) {
  return hostRef.value || document.getElementById(containerId);
}

async function initRecaptcha() {
  await loadScript("https://www.google.com/recaptcha/api.js?render=explicit", "recaptcha-api");
  await waitForGrecaptcha();

  const container = getRenderTarget(recaptchaHost, recaptchaContainerId);
  if (!container) {
    throw new Error("Không tìm thấy vùng hiển thị reCAPTCHA");
  }

  if (recaptchaWidgetId != null) {
    window.grecaptcha.reset(recaptchaWidgetId);
    return;
  }

  recaptchaWidgetId = window.grecaptcha.render(container, {
    sitekey: siteKey.value,
    callback: (token) => {
      captchaToken.value = token;
      emitChange();
    },
    "expired-callback": () => {
      captchaToken.value = "";
      emitChange();
    },
    "error-callback": () => {
      captchaToken.value = "";
      emitChange();
    },
  });
}

async function initTurnstile() {
  await loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js", "turnstile-api");
  await new Promise((resolve) => {
    const tick = () => {
      if (window.turnstile?.render) resolve();
      else setTimeout(tick, 50);
    };
    tick();
  });

  const container = getRenderTarget(turnstileHost, turnstileContainerId);
  if (!container) {
    throw new Error("Không tìm thấy vùng hiển thị Turnstile");
  }

  if (turnstileWidgetId != null) {
    window.turnstile.remove(turnstileWidgetId);
    turnstileWidgetId = null;
  }

  turnstileWidgetId = window.turnstile.render(container, {
    sitekey: siteKey.value,
    callback: (token) => {
      captchaToken.value = token;
      emitChange();
    },
    "expired-callback": () => {
      captchaToken.value = "";
      emitChange();
    },
  });
}

async function initWidget() {
  errorMessage.value = "";
  if (provider.value === "math") {
    await loadMathChallenge();
    return;
  }
  if (!siteKey.value) {
    errorMessage.value = "Thiếu site key CAPTCHA";
    return;
  }
  if (provider.value === "recaptcha") await initRecaptcha();
  if (provider.value === "turnstile") await initTurnstile();
}

function getPayload() {
  if (provider.value === "math") {
    return {
      captcha_id: captchaId.value,
      captcha_answer: mathAnswer.value,
    };
  }
  return { captcha_token: captchaToken.value };
}

async function reset() {
  captchaToken.value = "";
  if (provider.value === "math") {
    await loadMathChallenge();
  } else if (provider.value === "recaptcha" && recaptchaWidgetId != null) {
    window.grecaptcha?.reset(recaptchaWidgetId);
  } else if (provider.value === "turnstile" && turnstileWidgetId != null) {
    window.turnstile?.reset(turnstileWidgetId);
  }
  emitChange();
}

onMounted(async () => {
  try {
    await loadConfig();
    loading.value = false;
    await nextTick();
    await initWidget();
  } catch (e) {
    errorMessage.value = e.message || "Lỗi CAPTCHA";
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (turnstileWidgetId != null && window.turnstile) {
    window.turnstile.remove(turnstileWidgetId);
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

.math-captcha input {
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

.math-row {
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
}

.math-question {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--hl-primary);
}

.widget-host {
  min-height: 78px;
}

.captcha-error {
  margin-top: var(--hl-space-xs);
  color: var(--hl-error);
  font-size: 14px;
}
</style>
