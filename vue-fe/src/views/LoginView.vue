<template>
  <div class="login-page">
    <div class="login-left">
      <img src="/images/login.png" alt="login bg" class="login-image" />
    </div>
    <div class="login-right">
      <div class="login-form-container">
        <div class="login-header">
          <h2>Đăng Nhập</h2>
          <router-link to="/register" class="register-link">Đăng ký</router-link>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="login-form">
            <input v-model="username" placeholder="Tên đăng nhập" required />
            <input v-model="password" type="password" placeholder="Mật khẩu" required />
          </div>
          <button type="submit" :disabled="isLoading || isSuccess">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else-if="isSuccess" class="success-check">✓</span>
            <span v-else>Đăng nhập</span>
          </button>
          <p v-if="errorMessage">{{ errorMessage }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { getDefaultStaffPath, isStaffRole } from "@/utils/auth.js";

const username = ref("");
const password = ref("");
const errorMessage = ref("");
const isLoading = ref(false);
const isSuccess = ref(false);
const router = useRouter();

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  isSuccess.value = false;

  try {
    const res = await axios.post("http://localhost:3000/api/auth/login", {
      username: username.value,
      password: password.value,
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    const role = res.data.user?.role;
    isSuccess.value = true;
    ElMessage.success("Đăng nhập thành công!");

    setTimeout(() => {
      if (isStaffRole(role)) {
        router.push(getDefaultStaffPath(role));
      } else {
        router.push("/dashboard");
      }
    }, 800);
  } catch (err) {
    setTimeout(() => {
      isLoading.value = false;
      errorMessage.value = err.response?.data?.message || "Lỗi đăng nhập";
    }, 1000);
  }
};
</script>

<style scoped>
.login-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--hl-bg-section);
}

.login-left {
  width: 40%;
  background-color: var(--hl-bg-section);
}

.login-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.login-right {
  flex: 1;
  background-color: var(--hl-bg-section);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-form-container {
  width: 80%;
  max-width: 400px;
  background-color: var(--hl-bg-card);
  padding: var(--hl-space-2xl);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-lg);
}

.login-form input {
  width: 100%;
  padding: var(--hl-space-sm) var(--hl-space-md);
  margin: var(--hl-space-md) 0;
  border-radius: var(--hl-radius-sm);
  border: 1px solid var(--hl-border);
  background-color: var(--hl-bg-input);
  color: var(--hl-text);
  font-size: 1rem;
}

.login-form input:focus {
  outline: none;
  border-color: var(--hl-primary);
  box-shadow: 0 0 0 2px var(--hl-primary-bg);
}

button {
  width: 100%;
  padding: var(--hl-space-md);
  background-color: var(--hl-primary);
  border: none;
  color: white;
  font-weight: 600;
  border-radius: var(--hl-radius-md);
  margin-top: var(--hl-space-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: var(--hl-primary-hover);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid white;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.success-check {
  font-size: 20px;
  color: var(--hl-success);
  font-weight: bold;
  animation: scaleUp 0.2s ease-out;
}

@keyframes scaleUp {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

p {
  color: var(--hl-error);
  margin-top: var(--hl-space-sm);
  font-size: 14px;
}

h2 {
  color: var(--hl-text);
  font-size: 1.5rem;
  font-weight: 600;
}

.login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hl-space-lg);
}

.register-link {
  color: var(--hl-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
}

.register-link:hover {
  text-decoration: underline;
  color: var(--hl-primary-hover);
}
</style>
