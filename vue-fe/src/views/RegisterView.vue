<template>
  <div class="register-page">
    <div class="register-left">
      <img src="/images/login.png" alt="register bg" class="register-image" />
    </div>

    <div class="register-right">
      <div class="register-form-container">
        <div class="register-header">
          <router-link to="/login" class="login-link">Đăng nhập</router-link>
          <h2>Đăng ký</h2>
        </div>

        <form @submit.prevent="handleRegister">
          <input v-model="username" placeholder="Tên đăng nhập (chữ thường, số, _)" required />
          <p v-if="usernameWarning" class="field-warning">{{ usernameWarning }}</p>

          <input
            v-model="password"
            type="password"
            placeholder="Mật khẩu (8–32 ký tự)"
            minlength="8"
            maxlength="32"
            autocomplete="new-password"
            required
          />
          <p v-if="passwordWarning" class="field-warning">{{ passwordWarning }}</p>

          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Xác nhận mật khẩu"
            minlength="8"
            maxlength="32"
            autocomplete="new-password"
            required
          />
          <p v-if="confirmWarning" class="field-warning">{{ confirmWarning }}</p>

          <input v-model="fullName" placeholder="Họ và tên" maxlength="50" required />

          <input v-model="phone" placeholder="Số điện thoại" required @blur="checkPhoneTaken" />
          <p v-if="phoneTakenError || phoneWarning" class="field-warning">
            {{ phoneTakenError || phoneWarning }}
          </p>

          <CaptchaField ref="captchaRef" @update:valid="(v) => (captchaValid = v)" />

          <button type="submit" class="submit-btn" :disabled="!captchaValid">Đăng ký</button>
          <p v-if="errorMessage" class="submit-error">{{ errorMessage }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import CaptchaField from "@/components/CaptchaField.vue";

const router = useRouter();

const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const fullName = ref("");
const phone = ref("");
const errorMessage = ref("");
const phoneTakenError = ref("");
const captchaRef = ref(null);
const captchaValid = ref(false);

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

const usernameWarning = computed(() => {
  const v = username.value.trim().toLowerCase();
  if (!v) return "";
  return USERNAME_REGEX.test(v)
    ? ""
    : "Tên đăng nhập: 3–30 ký tự, chỉ chữ thường, số và gạch dưới";
});

// Inline warnings — chỉ hiện khi đã nhập
const phoneWarning = computed(() => {
  const v = phone.value.trim();
  if (!v) return "";
  return /^0\d{9}$/.test(v) ? "" : "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0";
});

const passwordWarning = computed(() => {
  const v = password.value;
  if (!v) return "";
  if (v.length > 32) return "Mật khẩu không được vượt quá 32 ký tự";
  if (v.length < 8) return "Mật khẩu phải có từ 8 đến 32 ký tự";
  return "";
});

const confirmWarning = computed(() => {
  if (!confirmPassword.value) return "";
  return password.value === confirmPassword.value ? "" : "Mật khẩu không khớp";
});

/** Kiểm tra SĐT đã tồn tại khi user rời ô nhập */
const checkPhoneTaken = async () => {
  phoneTakenError.value = "";
  const v = phone.value.trim();
  if (!/^0\d{9}$/.test(v)) return;
  try {
    await axios.get("/api/auth/check-phone", { params: { phone: v } });
  } catch (err) {
    if (err.response?.status === 409) {
      phoneTakenError.value = "Số điện thoại này đã được đăng ký";
    }
  }
};

const handleRegister = async () => {
  errorMessage.value = "";

  // Validate trước khi gửi (khớp backend: 8–32 ký tự)
  if (password.value.length < 8 || password.value.length > 32) {
    errorMessage.value = "Mật khẩu phải có độ dài từ 8 đến 32 ký tự";
    return;
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Mật khẩu không khớp";
    return;
  }
  const normalizedPhone = phone.value.trim();
  if (!/^0\d{9}$/.test(normalizedPhone)) {
    errorMessage.value = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0";
    return;
  }
  // Nếu đã có lỗi SĐT trùng (từ blur check) → không gửi, không hiện thêm errorMessage
  if (phoneTakenError.value) return;

  const normalizedUsername = username.value.trim().toLowerCase();
  if (!USERNAME_REGEX.test(normalizedUsername)) {
    errorMessage.value = "Tên đăng nhập không hợp lệ";
    return;
  }

  if (!captchaRef.value?.isReady?.()) {
    errorMessage.value = "Vui lòng hoàn thành xác minh CAPTCHA";
    return;
  }

  try {
    await axios.post("/api/auth/register", {
      username: normalizedUsername,
      password: password.value,
      full_name: fullName.value.trim(),
      phone: normalizedPhone,
      ...captchaRef.value.getPayload(),
    });
    ElMessage.success("Đăng ký thành công!");
    router.push("/login");
  } catch (err) {
    const msg = err.response?.data?.message || "Lỗi không xác định";
    // Nếu lỗi liên quan SĐT → chuyển thành inline error, không show errorMessage
    if (msg.toLowerCase().includes("điện thoại")) {
      phoneTakenError.value = msg;
    } else {
      errorMessage.value = msg;
    }
    captchaRef.value?.reset?.();
  }
};
</script>

<style scoped>
.register-page {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--hl-bg-section);
}

.register-left {
  width: 40%;
  background-color: var(--hl-bg-section);
}

.register-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.register-right {
  flex: 1;
  background-color: var(--hl-bg-section);
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
  padding: var(--hl-space-xl);
}

.register-form-container {
  background: var(--hl-bg-card);
  padding: var(--hl-space-2xl);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-md);
  min-width: 0;
  width: 100%;
  max-width: 400px;
}

.register-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hl-space-lg);
}

.register-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--hl-text);
}

.login-link {
  font-size: 1rem;
  color: var(--hl-primary);
  text-decoration: none;
  font-weight: 500;
}

.login-link:hover {
  color: var(--hl-primary-hover);
  text-decoration: underline;
}

input {
  display: block;
  width: 100%;
  padding: var(--hl-space-sm) var(--hl-space-md);
  margin-bottom: var(--hl-space-md);
  border: 1px solid var(--hl-border);
  border-radius: var(--hl-radius-sm);
  background: var(--hl-bg-input);
  color: var(--hl-text);
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: var(--hl-primary);
  box-shadow: 0 0 0 2px var(--hl-primary-bg);
}

.submit-btn {
  background-color: var(--hl-primary);
  color: white;
  width: 100%;
  padding: var(--hl-space-md);
  border: none;
  border-radius: var(--hl-radius-md);
  cursor: pointer;
  font-weight: 600;
  margin-top: var(--hl-space-xs);
  margin-bottom: 0;
  transition: background-color 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background-color: var(--hl-primary-hover);
}

.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Cảnh báo ngay dưới input — kéo sát ô nhập một chút */
.field-warning {
  margin-top: -8px;
  margin-bottom: var(--hl-space-md);
  color: var(--hl-error);
  font-size: 14px;
  line-height: 1.45;
}

/* Lỗi từ server sau nút Đăng ký — KHÔNG dùng margin âm (tránh bị che bởi nút) */
.submit-error {
  margin-top: var(--hl-space-md);
  margin-bottom: 0;
  color: var(--hl-error);
  font-size: 14px;
  line-height: 1.45;
}

@media (max-width: 768px) {
  .register-page {
    flex-direction: column;
  }

  .register-left {
    width: 100%;
    height: 160px;
  }

  .register-right {
    flex: 1;
    align-items: flex-start;
    padding: var(--hl-space-lg) var(--hl-space-md);
  }

  .register-form-container {
    max-width: none;
    padding: var(--hl-space-xl);
  }
}

@media (max-width: 480px) {
  .register-left {
    height: 110px;
  }

  .register-form-container {
    padding: var(--hl-space-lg);
  }
}
</style>
