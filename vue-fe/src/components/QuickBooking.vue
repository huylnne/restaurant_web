<template>
  <el-card class="booking-card">
    <h2 class="title">Đặt bàn nhanh</h2>
    <el-form :model="form" label-position="top" @submit.prevent="submitForm">
      <el-form-item label="Ngày đặt">
        <el-date-picker v-model="form.date" type="date" placeholder="Chọn ngày" />
      </el-form-item>

      <el-form-item label="Giờ">
        <el-time-picker v-model="form.time" placeholder="Chọn giờ" />
      </el-form-item>

      <el-form-item label="Số lượng khách">
        <el-input-number v-model="form.guests" :min="1" />
      </el-form-item>

      <el-form-item label="Ghi chú">
        <el-input type="textarea" v-model="form.note" rows="2" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="submitForm">Đặt bàn</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";

const form = ref({
  date: "",
  time: "",
  guests: 1,
  note: "",
});

const submitForm = async () => {
  if (!form.value.date || !form.value.time) {
    ElMessage.error("Vui lòng chọn ngày và giờ");
    return;
  }

  const date = new Date(form.value.date);
  const time = new Date(form.value.time);

  date.setHours(time.getHours());
  date.setMinutes(time.getMinutes());

  const payload = {
    reservation_time: date.toISOString(),
    number_of_guests: form.value.guests,
  };

  try {
    const token = localStorage.getItem("token"); // ⚠️ Giả sử bạn lưu token tại đây

    const res = await axios.post("/api/reservations", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    ElMessage.success(res.data.message || "Đặt bàn thành công");
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Đặt bàn thất bại");
  }
};
</script>

<style scoped>
.booking-card {
  max-width: 600px;
  margin: 40px auto;
  padding: 24px;
  background: #fffaf3;
}
.title {
  text-align: center;
  margin-bottom: 20px;
  color: #a16500;
}
</style>
