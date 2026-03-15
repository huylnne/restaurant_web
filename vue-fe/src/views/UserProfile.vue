<template>
  <div class="profile-page">
    <div class="container">
      <!-- ProfileCard: Avatar | User name | Upload avatar | ProfileForm -->
      <el-card class="profile-card">
        <h2 class="section-title">Hồ sơ cá nhân</h2>

        <div class="profile-card-inner">
          <!-- Avatar -->
          <div class="avatar-block">
            <img
              :src="avatarDisplayUrl"
              alt="Avatar"
              class="user-avatar"
              @error="onAvatarError"
            />
          </div>

          <!-- User name (display) -->
          <div class="user-name-block">
            <span class="user-name-label">Tên hiển thị</span>
            <p class="user-name">{{ form.full_name || "Chưa cập nhật tên" }}</p>
          </div>

          <!-- Upload avatar -->
          <div class="upload-section">
            <span class="upload-label">Cập nhật avatar</span>
            <el-radio-group v-model="uploadMode" class="upload-mode-group">
              <el-radio :label="'link'">Nhập đường dẫn</el-radio>
              <el-radio :label="'file'">Tải ảnh từ máy</el-radio>
            </el-radio-group>
            <div v-if="uploadMode === 'link'" class="avatar-input-wrap">
              <el-input v-model="form.avatar_url" placeholder="Dán URL ảnh" clearable />
            </div>
            <div v-else class="avatar-file-wrap">
              <input type="file" accept="image/*" @change="handleFileChange" class="file-input" />
              <img
                v-if="previewUrl"
                :src="previewUrl"
                alt="Preview"
                class="preview-image"
              />
            </div>
          </div>

          <!-- ProfileForm -->
          <div class="form-section">
            <el-form :model="form" label-position="top" class="profile-form">
              <el-form-item label="Họ tên">
                <el-input v-model="form.full_name" placeholder="Nhập họ tên" clearable />
              </el-form-item>
              <el-form-item label="Số điện thoại">
                <el-input v-model="form.phone" placeholder="Nhập số điện thoại" clearable />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="profileLoading"
                  @click="updateProfile"
                  class="btn-submit"
                >
                  Lưu thay đổi
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </el-card>

      <!-- Card 2: Đổi mật khẩu -->
      <el-card class="profile-card password-card">
        <h2 class="section-title">Đổi mật khẩu</h2>
        <el-form label-position="top" class="profile-form">
          <el-form-item label="Mật khẩu hiện tại">
            <el-input v-model="currentPassword" type="password" show-password placeholder="Nhập mật khẩu hiện tại" />
          </el-form-item>
          <el-form-item label="Mật khẩu mới">
            <el-input v-model="newPassword" type="password" show-password placeholder="Nhập mật khẩu mới" />
          </el-form-item>
          <el-form-item label="Xác nhận mật khẩu">
            <el-input v-model="confirmPassword" type="password" show-password placeholder="Xác nhận mật khẩu mới" />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="passwordLoading"
              @click="changePassword"
              class="btn-submit"
            >
              Lưu mật khẩu mới
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <MyReservations />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import MyReservations from "@/components/MyReservations.vue";

const DEFAULT_AVATAR = "https://maunhi.com/wp-content/uploads/2025/04/avatar-facebook-mac-dinh-3.jpeg";

const router = useRouter();

const form = ref({ full_name: "", phone: "", avatar_url: "" });
const uploadMode = ref("link");
const selectedFile = ref(null);
const previewUrl = ref("");
const profileLoading = ref(false);
const passwordLoading = ref(false);
const avatarError = ref(false);

const getAvatarUrl = (url) => {
  if (url === null || url === undefined || (typeof url === "string" && !url.trim())) {
    return DEFAULT_AVATAR;
  }
  if (url.startsWith("/uploads")) return `http://localhost:3000${url}`;
  return url;
};

const avatarDisplayUrl = computed(() => {
  if (avatarError.value) return DEFAULT_AVATAR;
  const url = previewUrl.value || form.value.avatar_url;
  return getAvatarUrl(url);
});

const onAvatarError = () => {
  avatarError.value = true;
};

onMounted(async () => {
  const token = localStorage.getItem("token");
  try {
    const res = await axios.get("http://localhost:3000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    form.value.full_name = res.data.full_name || res.data.name || "";
    form.value.phone = res.data.phone || "";
    form.value.avatar_url = res.data.avatar || res.data.avatar_url || "";
    avatarError.value = false;
  } catch (err) {
    console.error("Không lấy được thông tin user:", err);
  }
});

const handleFileChange = (e) => {
  selectedFile.value = e.target.files[0];
  previewUrl.value = selectedFile.value ? URL.createObjectURL(selectedFile.value) : "";
  avatarError.value = false;
};

const updateProfile = async () => {
  try {
    profileLoading.value = true;
    const token = localStorage.getItem("token");
    if (uploadMode.value === "file" && selectedFile.value) {
      const formData = new FormData();
      formData.append("image", selectedFile.value);
      const uploadRes = await axios.post("http://localhost:3000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      form.value.avatar_url = uploadRes.data.imageUrl;
    }
    const res = await axios.put("http://localhost:3000/api/users/profile", form.value, {
      headers: { Authorization: `Bearer ${token}` },
    });
    Object.assign(form.value, res.data.user);
    previewUrl.value = "";
    selectedFile.value = null;
    avatarError.value = false;
    ElMessage.success("Cập nhật thành công!");
  } catch (err) {
    console.error("Lỗi khi cập nhật:", err);
    ElMessage.error("Cập nhật thất bại!");
  } finally {
    profileLoading.value = false;
  }
};

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

const changePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    return ElMessage.error("Mật khẩu mới không khớp!");
  }

  try {
    passwordLoading.value = true;
    const token = localStorage.getItem("token");
    await axios.post(
      "http://localhost:3000/api/users/change-password",
      {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Đổi mật khẩu thành công!");
    currentPassword.value = newPassword.value = confirmPassword.value = "";
  } catch (err) {
    console.error("Lỗi đổi mật khẩu:", err);
    ElMessage.error("Đổi mật khẩu thất bại!");
  } finally {
    passwordLoading.value = false;
  }
};
</script>

<style scoped>
.profile-page {
  background-color: var(--hl-bg-section);
  min-height: 100vh;
  padding: var(--hl-space-lg) 0 var(--hl-space-2xl);
}

.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 var(--hl-space-md);
}

.profile-card {
  background-color: var(--hl-bg-card);
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-md);
  margin-bottom: var(--hl-space-lg);
  padding: var(--hl-space-xl);
  border: 1px solid var(--hl-border-light);
}

.profile-card :deep(.el-card__body) {
  padding: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--hl-primary);
  margin: 0 0 var(--hl-space-lg) 0;
  padding-bottom: var(--hl-space-md);
  border-bottom: 1px dashed var(--hl-border);
}

.profile-card-inner {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.avatar-block {
  display: flex;
  justify-content: center;
}

.user-avatar {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: var(--hl-shadow-md);
  background-color: var(--hl-bg-muted);
}

.user-name-block {
  text-align: center;
}

.user-name-label {
  font-size: 12px;
  color: var(--hl-text-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.user-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--hl-text);
  margin: var(--hl-space-xs) 0 0 0;
}

.upload-section {
  padding: var(--hl-space-md) 0;
  border-top: 1px solid var(--hl-border-light);
  border-bottom: 1px solid var(--hl-border-light);
}

.upload-label {
  display: block;
  font-weight: 500;
  color: var(--hl-text);
  margin-bottom: var(--hl-space-md);
  font-size: 14px;
}

.upload-mode-group {
  margin-bottom: 12px;
}

.avatar-input-wrap,
.avatar-file-wrap {
  margin-top: 12px;
}

.file-input {
  margin-bottom: var(--hl-space-md);
  font-size: 14px;
  color: var(--hl-text-secondary);
}

.preview-image {
  display: block;
  max-width: 120px;
  max-height: 120px;
  margin-top: var(--hl-space-md);
  border-radius: var(--hl-radius-md);
  box-shadow: var(--hl-shadow-sm);
  object-fit: cover;
}

.form-section {
  min-width: 0;
}

.profile-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.profile-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--hl-text);
  padding-bottom: 6px;
}

.profile-form :deep(.el-input__wrapper) {
  border-radius: var(--hl-radius-md);
  box-shadow: 0 0 0 1px var(--hl-border);
}

.profile-form :deep(.el-input__wrapper:hover),
.profile-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--hl-primary);
}

.btn-submit {
  min-width: 160px;
  background-color: var(--hl-primary);
  border-color: var(--hl-primary);
}

.btn-submit:hover,
.btn-submit:focus {
  background-color: var(--hl-primary-hover);
  border-color: var(--hl-primary-hover);
}

.password-card .profile-form {
  max-width: 400px;
}

@media (max-width: 640px) {
  .profile-card {
    padding: 20px 16px;
  }

  .section-title {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .user-avatar {
    width: 120px;
    height: 120px;
  }

  .user-name {
    font-size: 18px;
  }
}
</style>
