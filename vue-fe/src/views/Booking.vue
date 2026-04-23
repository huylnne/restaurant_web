<template>
  <div class="container">
    <div class="booking_grid">
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
            <el-date-picker
              v-model="form.date"
              type="date"
              placeholder="Chọn ngày"
              :disabled-date="disablePastDates"
            />
          </el-form-item>

          <el-form-item label="Giờ" :error="timeError">
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
import { ref, computed, watch } from "vue";
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

/** Disable dates before today */
const disablePastDates = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/** Tạo Date từ form.date + form.time; trả null nếu chưa chọn */
const buildReservationDate = () => {
  if (!form.value.date || !form.value.time) return null;
  const d = new Date(form.value.date);
  const t = new Date(form.value.time);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d;
};

/** Thời gian tối thiểu phải cách hiện tại ít nhất N phút */
const MIN_ADVANCE_MINUTES = 30;
const isTimeValid = (dt) => {
  if (!dt) return false;
  return dt.getTime() >= Date.now() + MIN_ADVANCE_MINUTES * 60 * 1000;
};

const timeError = computed(() => {
  if (!form.value.date || !form.value.time) return "";
  const dt = buildReservationDate();
  if (!dt) return "";
  if (!isTimeValid(dt)) return `Vui lòng chọn giờ cách hiện tại ít nhất ${MIN_ADVANCE_MINUTES} phút`;
  return "";
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

watch(
  [() => form.value.branch_id, () => form.value.date, () => form.value.time, () => form.value.guests],
  async () => {
    if (!form.value.branch_id || !form.value.date || !form.value.time || !form.value.guests) return;

    const date = buildReservationDate();
    if (!isTimeValid(date)) {
      availableTables.value = [];
      return;
    }

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

  const date = buildReservationDate();
  if (!isTimeValid(date)) {
    ElMessage.error(`Giờ đặt bàn phải cách hiện tại ít nhất ${MIN_ADVANCE_MINUTES} phút`);
    return;
  }

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
  background-color: var(--hl-bg-section);
  min-height: 100vh;
  padding: var(--hl-space-xl) var(--hl-space-md);
}

.booking_grid :deep(.el-card) {
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  border: 1px solid var(--hl-border-light);
}

.booking-card {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--hl-space-xl);
  background-color: var(--hl-bg-card);
}

.title {
  text-align: center;
  margin-bottom: var(--hl-space-lg);
  color: var(--hl-primary);
  font-size: 1.5rem;
  font-weight: 600;
}
</style>
