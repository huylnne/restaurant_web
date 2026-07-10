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
              format="HH:m"
            />
          </el-form-item>

          <el-form-item label="Số lượng khách">
            <el-input-number v-model="form.guests" :min="1" :max="MAX_GUESTS" />
          </el-form-item>

          <p
            v-if="availabilityMessage && !timeError"
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
import { MAX_GUESTS } from "@/constants/reservation";
import {
  buildLocalReservationDate,
  getOpeningHoursError,
  RESERVATION_HOLD_MINUTES,
} from "@/utils/branchHours";

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

const MAX_ADVANCE_DAYS = 14;
const MAX_ADVANCE_MS = MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;

/** Disable dates before today và quá 14 ngày */
const disablePastDates = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);
  return date < today || date > maxDate;
};

/** Tạo Date từ form.date + form.time; trả null nếu chưa chọn */
const buildReservationDate = () =>
  buildLocalReservationDate(form.value.date, form.value.time);

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
  if (dt.getTime() > Date.now() + MAX_ADVANCE_MS) {
    return `Chỉ được đặt bàn tối đa ${MAX_ADVANCE_DAYS} ngày tới`;
  }
  const hoursErr = getOpeningHoursError(
    dt,
    selectedBranch.value?.open_time,
    selectedBranch.value?.close_time,
    { holdMinutes: RESERVATION_HOLD_MINUTES }
  );
  if (hoursErr) return hoursErr;
  return "";
});

const availabilityMessage = ref("");
const canSubmit = ref(false);

const selectedBranch = computed(() =>
  branches.value.find((b) => Number(b.branch_id) === Number(form.value.branch_id)) || null
);

const getHoursValidationError = (dt) =>
  getOpeningHoursError(
    dt,
    selectedBranch.value?.open_time,
    selectedBranch.value?.close_time,
    { holdMinutes: RESERVATION_HOLD_MINUTES }
  );

const fetchBranches = async () => {
  try {
    const res = await axios.get("/api/home/branches");
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
  [
    branches,
    () => form.value.branch_id,
    () => form.value.date,
    () => form.value.time,
    () => form.value.guests,
  ],
  async () => {
    availabilityMessage.value = "";
    canSubmit.value = false;

    if (!form.value.branch_id || !form.value.date || !form.value.time || !form.value.guests) return;

    if (form.value.guests > MAX_GUESTS) {
      availabilityMessage.value = `Số khách phải từ 1 đến ${MAX_GUESTS}`;
      return;
    }

    const date = buildReservationDate();
    if (!isTimeValid(date)) return;
    if (date.getTime() > Date.now() + MAX_ADVANCE_MS) return;
    if (getHoursValidationError(date)) return;

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
  if (date.getTime() > Date.now() + MAX_ADVANCE_MS) {
    ElMessage.error(`Chỉ được đặt bàn tối đa ${MAX_ADVANCE_DAYS} ngày tới`);
    return;
  }
  const hoursErr = getHoursValidationError(date);
  if (hoursErr) {
    ElMessage.error(hoursErr);
    return;
  }

  if (form.value.guests < 1 || form.value.guests > MAX_GUESTS) {
    ElMessage.error(`Số khách phải từ 1 đến ${MAX_GUESTS}`);
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

    const order = res.data.order;
    const order_id = order?.order_id;
    if (order_id) {
      localStorage.setItem("activeOrder", JSON.stringify(order));
      localStorage.removeItem("reservation");
      const successTitle = res.data.multiTable
        ? `Đặt bàn thành công (${res.data.tables?.length || 0} bàn ghép)!`
        : "Đặt bàn thành công!";
      ElMessageBox.confirm("Bạn có muốn đặt món trước không?", successTitle, {
        confirmButtonText: "Có, đặt món luôn",
        cancelButtonText: "Không, để sau",
        type: "info",
      })
        .then(() => {
          ElMessage.success("Chuyển sang bước đặt món!");

          router.push({
            name: "OrderMenu",
            query: { order_id, branch_id: form.value.branch_id },
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
  background-image:
    radial-gradient(ellipse at 20% 0%, rgba(161, 101, 0, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(46, 74, 61, 0.05) 0%, transparent 50%);
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
  font-family: var(--hl-font-display);
  color: var(--hl-secondary);
  font-size: 1.75rem;
  font-weight: 700;
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

.booking-card :deep(.el-select),
.booking-card :deep(.el-date-editor),
.booking-card :deep(.el-input-number),
.booking-card :deep(.el-button) {
  width: 100%;
}

.booking-card :deep(.el-form-item__error) {
  position: static;
  margin-top: 6px;
  line-height: 1.45;
}

.booking-card :deep(.el-form-item.is-error) {
  margin-bottom: 22px;
}

@media (max-width: 768px) {
  .booking_grid {
    min-height: auto;
    padding: var(--hl-space-lg) var(--hl-space-md);
  }

  .booking-card {
    max-width: none;
    padding: var(--hl-space-lg);
  }
}

@media (max-width: 480px) {
  .booking_grid {
    padding: var(--hl-space-md);
  }

  .booking-card {
    padding: var(--hl-space-md);
  }

  .booking-card :deep(.el-card__body) {
    padding: var(--hl-space-md);
  }

  .booking-branch-hint {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
