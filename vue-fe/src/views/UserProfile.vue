<template>
  <UserNavbar />
  <div class="profile-page">
    <div class="card-wrapper">
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>Hồ sơ cá nhân</span>
            <el-button type="default" @click="goBack" class="back-button">
              ← Quay lại trang chủ
            </el-button>
          </div>
        </template>

        <div class="profile-content">
          <div class="avatar-section">
            <img :src="getAvatarUrl(form.avatar_url)" alt="Avatar" class="user-avatar" />
          </div>

          <div class="form-section">
            <el-form :model="form" label-width="140px">
              <el-form-item label="Họ tên">
                <el-input v-model="form.full_name" />
              </el-form-item>

              <el-form-item label="Số điện thoại">
                <el-input v-model="form.phone" />
              </el-form-item>

              <el-form-item label="Cập nhật avatar">
                <el-radio-group v-model="uploadMode">
                  <el-radio :label="'link'">Nhập đường dẫn</el-radio>
                  <el-radio :label="'file'">Tải ảnh từ máy</el-radio>
                </el-radio-group>

                <div v-if="uploadMode === 'link'" style="margin-top: 10px">
                  <el-input v-model="form.avatar_url" placeholder="Dán URL ảnh" />
                </div>

                <div v-else style="margin-top: 10px">
                  <input type="file" accept="image/*" @change="handleFileChange" />
                  <img
                    v-if="previewUrl"
                    :src="previewUrl"
                    alt="Preview"
                    class="preview-image"
                  />
                </div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="updateProfile">Lưu thay đổi</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <el-divider />

        <h3>🔒 Đổi mật khẩu</h3>
        <el-form label-width="140px" class="form-section">
          <el-form-item label="Mật khẩu hiện tại">
            <el-input v-model="currentPassword" type="password" show-password />
          </el-form-item>

          <el-form-item label="Mật khẩu mới">
            <el-input v-model="newPassword" type="password" show-password />
          </el-form-item>

          <el-form-item label="Xác nhận mật khẩu">
            <el-input v-model="confirmPassword" type="password" show-password />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="changePassword">Lưu mật khẩu mới</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <MyReservations />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import MyReservations from "@/components/MyReservations.vue";
import UserNavbar from "@/components/UserNavbar.vue";

const router = useRouter();

const form = ref({ full_name: "", phone: "", avatar_url: "" });
const uploadMode = ref("link");
const selectedFile = ref(null);
const previewUrl = ref("");

onMounted(async () => {
  const token = localStorage.getItem("token");
  try {
    const res = await axios.get("http://localhost:3000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    form.value.full_name = res.data.full_name || res.data.name || "";
    form.value.phone = res.data.phone || "";
    form.value.avatar_url = res.data.avatar || res.data.avatar_url || "";
  } catch (err) {
    console.error("Không lấy được thông tin user:", err);
  }
});

const handleFileChange = (e) => {
  selectedFile.value = e.target.files[0];
  previewUrl.value = URL.createObjectURL(selectedFile.value);
};

const updateProfile = async () => {
  try {
    const token = localStorage.getItem("token");
    if (uploadMode.value === "file" && selectedFile.value) {
      const formData = new FormData();
      formData.append("image", selectedFile.value);
      const uploadRes = await axios.post("http://localhost:3000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      form.value.avatar_url = uploadRes.data.imageUrl;
    }
    const res = await axios.put("http://localhost:3000/api/users/me", form.value, {
      headers: { Authorization: `Bearer ${token}` },
    });
    Object.assign(form.value, res.data.user);
    ElMessage.success("Cập nhật thành công!");
  } catch (err) {
    console.error("Lỗi khi cập nhật:", err);
    ElMessage.error("Cập nhật thất bại!");
  }
};

const goBack = () => router.push("/dashboard");

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

const changePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    return ElMessage.error("Mật khẩu mới không khớp!");
  }

  try {
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
  }
};

const getAvatarUrl = (url) => {
  if (!url) return "/default-avatar.png";
  if (url.startsWith("/uploads")) return `http://localhost:3000${url}`;
  return url;
};
</script>

<style scoped>
/* Nền ngoài: màu 2 bên */
.profile-page {
  background-color: #fff7e6;
  min-height: 100vh;
  padding: 40px 0;
}

/* Khung giữa: card trắng */
.card-wrapper {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 30px;
}

/* Giữ nguyên layout nội dung */
.profile-content {
  display: flex;
  gap: 30px;
  align-items: flex-start;
  margin-bottom: 30px;
}

.avatar-section {
  flex: 0 0 150px;
}

.user-avatar {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.preview-image {
  width: 100px;
  margin-top: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.form-section {
  flex: 1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-button {
  color: black;
}
</style>
