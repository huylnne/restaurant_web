<template>
  <el-card class="booking-card">
    <h2 class="title">Đặt bàn nhanh</h2>
    <el-form :model="form" label-position="top" @submit.prevent="submitForm">
      <el-form-item label="Chi nhánh">
        <el-select v-model="form.branch_id" placeholder="Chọn chi nhánh">
          <el-option
            v-for="branch in branches"
            :key="branch.branch_id"
            :label="branch.name"
            :value="branch.branch_id"
          />
        </el-select>
      </el-form-item>

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
</template>

<script setup>
import { ref, watch } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
const router = useRouter();
const branches = ref([]);
const form = ref({
  branch_id: 1,
  date: "",
  time: "",
  guests: 1,
  note: "",
  table_id: null,
});

const availableTables = ref([]);

const fetchBranches = async () => {
  try {
    const res = await axios.get("http://localhost:3000/api/home/branches");
    branches.value = Array.isArray(res.data) ? res.data : [];
    if (branches.value.length && !branches.value.some((b) => b.branch_id === form.value.branch_id)) {
      form.value.branch_id = branches.value[0].branch_id;
    }
  } catch (error) {
    console.error("Lỗi tải chi nhánh:", error);
  }
};

fetchBranches();

// Tự động fetch bàn mỗi khi thay đổi ngày, giờ, số lượng khách
watch(
  [() => form.value.branch_id, () => form.value.date, () => form.value.time, () => form.value.guests],
  async () => {
    if (!form.value.branch_id || !form.value.date || !form.value.time || !form.value.guests) return;

    const date = new Date(form.value.date);
    const time = new Date(form.value.time);
    date.setHours(time.getHours());
    date.setMinutes(time.getMinutes());

    try {
      const res = await axios.get("/api/reservations/available", {
        params: {
          branch_id: form.value.branch_id,
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
  if (!form.value.branch_id || !form.value.date || !form.value.time || !form.value.table_id) {
    ElMessage.error("Vui lòng điền đầy đủ thông tin và chọn bàn");
    return;
  }

  const date = new Date(form.value.date);
  const time = new Date(form.value.time);
  date.setHours(time.getHours());
  date.setMinutes(time.getMinutes());

  const payload = {
    branch_id: form.value.branch_id,
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

    // Lấy reservation_id từ response (thường backend trả về)
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
          // Chuyển sang màn đặt món trước, truyền reservation_id
          router.push({ name: "OrderMenu", query: { reservation_id } });
        })
        .catch(() => {
          ElMessage.success("Đặt bàn thành công!");
          // Không đặt món luôn, quay về profile hoặc trang chủ
          router.push("/dashboard");
        });
    } else {
      // fallback nếu không lấy được reservation_id
      ElMessage.error("Không lấy được mã đặt bàn! Vui lòng thử lại.");
      router.push("/profile");
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Đặt bàn thất bại");
  }
};
</script>

<style scoped>
.booking-card {
  max-width: 600px;
  margin: var(--hl-space-2xl) auto;
  padding: var(--hl-space-xl);
  background: var(--hl-bg-page);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  border: 1px solid var(--hl-border-light);
}

.booking-card :deep(.el-card__body) {
  padding: var(--hl-space-lg);
}

.title {
  text-align: center;
  margin-bottom: var(--hl-space-lg);
  color: var(--hl-primary);
  font-weight: 600;
  font-size: 1.25rem;
}
</style>
