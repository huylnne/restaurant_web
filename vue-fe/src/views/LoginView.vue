<template>
  <div class="login-container">
    <h2>Đăng Nhập</h2>
    <form @submit.prevent="handleLogin">
      <div class="login-form">
        <input v-model="username" placeholder="Tên đăng nhập" required />
        <input v-model="password" type="password" placeholder="Mật khẩu" required />
      </div>
      <button type="submit">Đăng nhập</button>
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const username = ref("");
const password = ref("");
const errorMessage = ref("");
const router = useRouter();

const handleLogin = async () => {
  try {
    const res = await axios.post("http://localhost:3000/api/auth/login", {
      username: username.value,
      password: password.value,
    });
    localStorage.setItem("token", res.data.token);
    alert("Đăng nhập thành công");
    router.push("/"); // hoặc router.push('/menu')
  } catch (err) {
    errorMessage.value = err.response?.data?.message || "Lỗi đăng nhập";
  }
};
</script>

<style scoped>
.login-container {
  width: 300px;
  margin: auto;
  padding: 30px;
  border: 1px solid #ccc;
  border-radius: 10px;
}
</style>
