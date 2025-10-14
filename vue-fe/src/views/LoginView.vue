<template>
  <div class="login-page">
    <div class="login-left">
      <img src="/images/login.png" alt="login bg" class="login-image" />
    </div>
    <div class="login-right">
      <div class="login-form-container">
        <div class="login-header">
          <h2>Đăng Nhập</h2>
          <a href="/register" class="register-link">Đăng ký</a>
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

    setTimeout(() => {
      if (role === "admin") {
        router.push("./admin");
      } else {
        router.push("/");
      }
    }, 1000);
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
}

.login-left {
  width: 40%;
  background-color: #f0e9dc;
}

.login-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.login-right {
  flex: 1;
  background-color: #f0e9dc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-form-container {
  width: 80%;
  max-width: 400px;
  background-color: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  color: white;
}

.login-form input {
  width: 100%;
  padding: 10px;
  margin: 12px 0;
  border-radius: 6px;
  border: none;
  background-color: white;
  color: #333;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #2563eb;
  border: none;
  color: white;
  font-weight: bold;
  border-radius: 8px;
  margin-top: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

button:hover {
  background-color: #1d4ed8;
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
  color: #4ade80;
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
  color: #ff6b6b;
  margin-top: 10px;
}

h2 {
  color: black;
}

.login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.register-link {
  color: #2563eb;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.6rem;
}

.register-link:hover {
  text-decoration: underline;
}
</style>
