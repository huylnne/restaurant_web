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
        <el-time-picker
          v-model="form.time"
          placeholder="Chọn giờ"
          format="HH:mm"
        />
      </el-form-item>

      <el-form-item label="Số lượng khách">
        <el-input-number v-model="form.guests" :min="1" :max="MAX_GUESTS" />
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
</template>

<script setup>
import { ref, watch } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import CaptchaField from "@/components/CaptchaField.vue";
import { MAX_GUESTS } from "@/constants/reservation";

const router = useRouter();
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

const availabilityMessage = ref("");
const canSubmit = ref(false);

const buildReservationDate = () => {
  if (!form.value.date || !form.value.time) return null;
  const d = new Date(form.value.date);
  const t = new Date(form.value.time);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d;
};

const fetchBranches = async () => {
  try {
    const res = await axios.get("/api/home/branches");
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
    availabilityMessage.value = "";
    canSubmit.value = false;

    if (!form.value.branch_id || !form.value.date || !form.value.time || !form.value.guests) return;

    if (form.value.guests > MAX_GUESTS) {
      availabilityMessage.value = `Số khách phải từ 1 đến ${MAX_GUESTS}`;
      return;
    }

    const date = buildReservationDate();
    if (!date) return;

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
  if (!date) return;

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
      ElMessageBox.confirm("Bạn có muốn đặt món trước không?", "Đặt bàn thành công!", {
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
