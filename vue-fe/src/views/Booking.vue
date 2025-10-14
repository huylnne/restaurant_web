<template>
  <div class="container">
    <Header />
    <div class="booking_grid">
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

          <el-form-item label="Chọn bàn">
            <el-select
              v-model="form.table_id"
              placeholder="Chọn bàn"
              :disabled="availableTables.length === 0"
            >
              <el-option
                v-for="table in availableTables"
                :key="table.table_id"
                :label="`Bàn số ${table.table_number} (Tối đa ${table.capacity} khách)`"
                :value="table.table_id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Ghi chú">
            <el-input type="textarea" v-model="form.note" rows="2" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="submitForm">Đặt bàn</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import Header from "../components/UserNavbar.vue";
import { ref, watch } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
const router = useRouter();
const form = ref({
  date: "",
  time: "",
  guests: 1,
  note: "",
  table_id: null,
});

const availableTables = ref([]);

watch(
  [() => form.value.date, () => form.value.time, () => form.value.guests],
  async () => {
    if (!form.value.date || !form.value.time || !form.value.guests) return;

    const date = new Date(form.value.date);
    const time = new Date(form.value.time);
    date.setHours(time.getHours());
    date.setMinutes(time.getMinutes());

    try {
      const res = await axios.get("/api/reservations/available", {
        params: {
          reservation_time: date.toISOString(),
          guests: form.value.guests,
        },
      });
      availableTables.value = res.data.tables || [];
    } catch (err) {
      availableTables.value = [];
      console.error(err);
    }
  }
);

const submitForm = async () => {
  if (!form.value.date || !form.value.time || !form.value.table_id) {
    ElMessage.error("Vui lòng điền đầy đủ thông tin và chọn bàn");
    return;
  }

  const date = new Date(form.value.date);
  const time = new Date(form.value.time);
  date.setHours(time.getHours());
  date.setMinutes(time.getMinutes());

  const payload = {
    reservation_time: date.toISOString(),
    number_of_guests: form.value.guests,
    note: form.value.note,
    table_id: form.value.table_id,
  };

  try {
    const token = localStorage.getItem("token");

    const res = await axios.post("/api/reservations", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const reservation_id = res.data.reservation.reservation_id;
    const reservation = res.data.reservation;
    if (reservation_id) {
      localStorage.setItem("reservation", JSON.stringify(reservation));
      ElMessageBox.confirm("Bạn có muốn đặt món trước không?", "Đặt bàn thành công!", {
        confirmButtonText: "Có, đặt món luôn",
        cancelButtonText: "Không, để sau",
        type: "info",
      })
        .then(() => {
          ElMessage.success("Chuyển sang bước đặt món!");

          router.push({ name: "OrderMenu", query: { reservation_id } });
        })
        .catch(() => {
          ElMessage.success("Đặt bàn thành công!");

          router.push("/dashboard");
        });
    } else {
      ElMessage.error("Không lấy được mã đặt bàn! Vui lòng thử lại.");
      router.push("/profile");
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Đặt bàn thất bại");
  }
};
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
}

.booking_grid {
  background-color: #f0e9dc;
  min-height: 100vh;
}

.booking-card {
  max-width: 600px;
  margin: 40px auto;
  padding: 24px;
  background-color: #fff;
}
.title {
  text-align: center;
  margin-bottom: 20px;
  color: #a16500;
}
</style>
