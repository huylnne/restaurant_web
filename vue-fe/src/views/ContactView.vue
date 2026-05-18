<template>
  <div class="static-page">
    <StaticPageHero
      eyebrow="Liên hệ"
      title="Liên hệ HL Food"
      :subtitle="`Hotline ${BRAND.hotline} · ${BRAND.email} · Mở cửa ${BRAND.hours}`"
      image="/images/homeimg1.png"
    />

    <div class="static-page__container contact-layout">
      <div class="hl-card contact-info-card">
        <h2 class="hl-title-primary">Thông tin liên hệ</h2>
        <div class="contact-info-row">
          <el-icon><Phone /></el-icon>
          <div>
            <strong>Hotline</strong>
            <p>
              <a :href="`tel:${BRAND.hotline}`">{{ BRAND.hotline }}</a>
            </p>
          </div>
        </div>
        <div class="contact-info-row">
          <el-icon><Message /></el-icon>
          <div>
            <strong>Email</strong>
            <p>
              <a :href="`mailto:${BRAND.email}`">{{ BRAND.email }}</a>
            </p>
          </div>
        </div>
        <div class="contact-info-row">
          <el-icon><Clock /></el-icon>
          <div>
            <strong>Giờ mở cửa</strong>
            <p>{{ BRAND.hours }} (tất cả các ngày trong tuần)</p>
          </div>
        </div>

        <h3 class="section-heading" style="text-align: left; margin-top: 1.5rem">Chi nhánh</h3>
        <el-skeleton v-if="loadingBranches" :rows="3" animated />
        <el-empty v-else-if="!branches.length" description="Chưa có dữ liệu chi nhánh" />
        <div v-else class="branch-list-mini">
          <div
            v-for="b in branches"
            :key="b.branch_id"
            class="branch-mini hl-card"
          >
            <strong>{{ b.name }}</strong>
            <p>{{ b.address }}</p>
            <p v-if="b.phone">ĐT: {{ b.phone }}</p>
          </div>
        </div>
      </div>

      <div class="hl-card contact-form-card">
        <h2 class="hl-title-primary">Gửi tin nhắn</h2>
        <p class="static-lead" style="margin-bottom: 1rem">
          Điền form bên dưới — chúng tôi sẽ phản hồi trong giờ hành chính.
        </p>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
          <el-form-item label="Họ và tên" prop="name">
            <el-input v-model="form.name" placeholder="Nguyễn Văn A" />
          </el-form-item>
          <el-form-item label="Số điện thoại" prop="phone">
            <el-input v-model="form.phone" placeholder="0xxxxxxxxx" />
          </el-form-item>
          <el-form-item label="Email" prop="email">
            <el-input v-model="form.email" type="email" placeholder="email@example.com" />
          </el-form-item>
          <el-form-item label="Chủ đề" prop="subject">
            <el-select v-model="form.subject" placeholder="Chọn chủ đề" style="width: 100%">
              <el-option label="Đặt bàn / Sự kiện" value="booking" />
              <el-option label="Góp ý dịch vụ" value="feedback" />
              <el-option label="Hợp tác / Tuyển dụng" value="other" />
              <el-option label="Khác" value="general" />
            </el-select>
          </el-form-item>
          <el-form-item label="Nội dung" prop="message">
            <el-input
              v-model="form.message"
              type="textarea"
              :rows="5"
              maxlength="2000"
              show-word-limit
              placeholder="Nội dung cần hỗ trợ..."
            />
          </el-form-item>
          <el-button type="primary" native-type="submit" :loading="submitting" style="width: 100%">
            Gửi liên hệ
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { Phone, Message, Clock } from "@element-plus/icons-vue";
import StaticPageHero from "@/components/StaticPageHero.vue";
import { BRAND } from "@/config/siteContent";

const branches = ref([]);
const loadingBranches = ref(true);
const submitting = ref(false);
const formRef = ref(null);

const form = ref({
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
});

const phonePattern = /^0\d{9}$/;

const rules = {
  name: [{ required: true, message: "Vui lòng nhập họ tên", trigger: "blur" }],
  phone: [
    { required: true, message: "Vui lòng nhập số điện thoại", trigger: "blur" },
    {
      pattern: phonePattern,
      message: "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0",
      trigger: "blur",
    },
  ],
  email: [
    { required: true, message: "Vui lòng nhập email", trigger: "blur" },
    { type: "email", message: "Email không hợp lệ", trigger: "blur" },
  ],
  subject: [{ required: true, message: "Vui lòng chọn chủ đề", trigger: "change" }],
  message: [
    { required: true, message: "Vui lòng nhập nội dung", trigger: "blur" },
    { min: 10, message: "Nội dung tối thiểu 10 ký tự", trigger: "blur" },
  ],
};

onMounted(async () => {
  try {
    const res = await axios.get("/api/home/branches");
    const list = Array.isArray(res.data) ? res.data : [];
    branches.value = list.filter((b) => b.is_active !== false);
  } catch (e) {
    console.error(e);
  } finally {
    loadingBranches.value = false;
  }
});

const submit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  submitting.value = true;
  await new Promise((r) => setTimeout(r, 600));
  submitting.value = false;
  ElMessage.success("Đã gửi tin nhắn thành công! Chúng tôi sẽ liên hệ lại sớm.");
  form.value = { name: "", phone: "", email: "", subject: "", message: "" };
  formRef.value.resetFields();
};
</script>

<style scoped>
@import "@/assets/static-pages.css";

.branch-list-mini {
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-md);
}

.branch-mini {
  padding: var(--hl-space-md);
  font-size: 0.9rem;
}

.branch-mini strong {
  color: var(--hl-primary);
  display: block;
  margin-bottom: 4px;
}

.branch-mini p {
  color: var(--hl-text-muted);
  margin: 2px 0;
}
</style>
