<template>
  <div class="container">
    <div class="booking_grid">
      <el-card class="booking-card">
        <h2 class="title">Đặt bàn nhanh</h2>
        <p class="booking-branch-hint">
          Chưa biết chi nhánh nào gần?
          <router-link to="/branches/nearby">Tìm chi nhánh gần bạn →</router-link>
          ·
          <router-link to="/branches">Danh sách tất cả</router-link>
        </p>
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
            <el-time-picker
              v-model="form.time"
              placeholder="Chọn giờ"
              format="HH:mm"
            />
          </el-form-item>

          <el-form-item label="Số lượng khách">
            <el-input-number v-model="form.guests" :min="1" />
          </el-form-item>

          <p
            v-if="availabilityMessage"
            class="availability-hint"
            :class="canSubmit ? 'availability-hint--ok' : 'availability-hint--warn'"
          >
            {{ availabilityMessage }}
          </p>

          <el-form-item label="Ghi chú">
            <el-input type="textarea" v-model="form.note" rows="2" />
          </el-form-item>

          <CaptchaField ref="captchaRef" @update:valid="(v) => (captchaValid = v)" />

          <el-form-item>
            <el-button type="primary" :disabled="!canSubmit || !captchaValid" @click="submitForm">
              Đặt bàn
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter, useRoute } from "vue-router";
import CaptchaField from "@/components/CaptchaField.vue";

const router = useRouter();
const route = useRoute();
const captchaRef = ref(null);
const captchaValid = ref(false);
const branches = ref([]);
const form = ref({
  branch_id: 1,
  date: "",
  time: "",
  guests: 1,
  note: "",
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

const availabilityMessage = ref("");
const canSubmit = ref(false);

const fetchBranches = async () => {
  try {
    const res = await axios.get("http://localhost:3000/api/home/branches");
    branches.value = Array.isArray(res.data) ? res.data : [];
    if (branches.value.length && !branches.value.some((b) => b.branch_id === form.value.branch_id)) {
      form.value.branch_id = branches.value[0].branch_id;
    }
    const fromQuery = Number(route.query.branch_id);
    if (fromQuery && branches.value.some((b) => b.branch_id === fromQuery)) {
      form.value.branch_id = fromQuery;
    }
  } catch (error) {
    console.error("Lỗi tải chi nhánh:", error);
  }
};

fetchBranches();

watch(
  [() => form.value.branch_id, () => form.value.date, () => form.value.time, () => form.value.guests],
  async () => {
    availabilityMessage.value = "";
    canSubmit.value = false;

    if (!form.value.branch_id || !form.value.date || !form.value.time || !form.value.guests) return;

    const date = buildReservationDate();
    if (!isTimeValid(date)) return;

    try {
      const res = await axios.get("/api/reservations/available", {
        params: {
          branch_id: form.value.branch_id,
          reservation_time: date.toISOString(),
          guests: form.value.guests,
        },
      });
      canSubmit.value = !!res.data.available;
      availabilityMessage.value = res.data.message || "";
    } catch (err) {
      availabilityMessage.value =
        err.response?.data?.message || "Không kiểm tra được bàn trống. Vui lòng thử lại.";
      console.error(err);
    }
  }
);

const submitForm = async () => {
  if (!form.value.branch_id || !form.value.date || !form.value.time) {
    ElMessage.error("Vui lòng điền đầy đủ thông tin");
    return;
  }

  const date = buildReservationDate();
  if (!isTimeValid(date)) {
    ElMessage.error(`Giờ đặt bàn phải cách hiện tại ít nhất ${MIN_ADVANCE_MINUTES} phút`);
    return;
  }

  if (!canSubmit.value) {
    ElMessage.error(availabilityMessage.value || "Hiện không còn bàn phù hợp trong khung giờ này");
    return;
  }

  if (!captchaRef.value?.isReady?.()) {
    ElMessage.error("Vui lòng hoàn thành xác minh CAPTCHA");
    return;
  }

  const payload = {
    branch_id: form.value.branch_id,
    reservation_time: date.toISOString(),
    number_of_guests: form.value.guests,
    note: form.value.note,
    ...captchaRef.value.getPayload(),
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

          router.push({
            name: "OrderMenu",
            query: { reservation_id, branch_id: form.value.branch_id },
          });
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
    captchaRef.value?.reset?.();
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
  margin-bottom: var(--hl-space-sm);
  color: var(--hl-primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.booking-branch-hint {
  text-align: center;
  font-size: 0.9rem;
  color: var(--hl-text-muted);
  margin: 0 0 var(--hl-space-lg);
}

.booking-branch-hint a {
  color: var(--hl-primary);
  font-weight: 500;
  text-decoration: none;
}

.booking-branch-hint a:hover {
  text-decoration: underline;
}

.availability-hint {
  margin: 0 0 var(--hl-space-md);
  padding: var(--hl-space-sm) var(--hl-space-md);
  border-radius: var(--hl-radius-md);
  font-size: 0.9rem;
  line-height: 1.45;
}

.availability-hint--ok {
  background: #eef7f0;
  color: #2e6b3e;
  border: 1px solid #c8e6d0;
}

.availability-hint--warn {
  background: #fff8e8;
  color: #8a6d1d;
  border: 1px solid #f0e0b8;
}
</style>
