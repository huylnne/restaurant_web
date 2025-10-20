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
          <input v-model="username" placeholder="Tên đăng nhập" required />
          <input v-model="password" type="password" placeholder="Mật khẩu" required />
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Xác nhận mật khẩu"
            required
          />
          <input v-model="fullName" placeholder="Họ và tên" required />
          <input v-model="phone" placeholder="Số điện thoại" required />

          <button type="submit">Đăng ký</button>
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

const router = useRouter();

const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const fullName = ref("");
const phone = ref("");
const branchId = ref(1);
const errorMessage = ref("");

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Mật khẩu không khớp!";
    return;
  }

  try {
    const res = await axios.post("http://localhost:3000/api/auth/register", {
      username: username.value,
      password: password.value,
      full_name: fullName.value,
      phone: phone.value,
      branch_id: branchId.value,
      role: "user",
    });

    alert("Đăng ký thành công!");
    router.push("/login");
  } catch (err) {
    if (err.response && err.response.data?.message) {
      errorMessage.value = err.response.data.message;
    } else {
      errorMessage.value = "Lỗi không xác định!";
    }
  }
};
</script>

<style scoped>
.register-page {
  display: flex;
  height: 100vh;
}

.register-left {
  width: 40%;
}

.register-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.register-right {
  flex: 1;
  background-color: #f3ede2;
  display: flex;
  justify-content: center;
  align-items: center;
}

.register-form-container {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  width: 100%;
  max-width: 400px;
}

.register-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.register-header h2 {
  font-size: 20px;
  font-weight: bold;
  color: #000;
}

.login-link {
  font-size: 16px;
  color: #0055ff;
  text-decoration: none;
}

input {
  display: block;
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #f1f7ff;
}

button {
  background-color: #1a73e8;
  color: white;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
</style>
