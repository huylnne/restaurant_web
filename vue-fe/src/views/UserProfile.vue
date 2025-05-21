<template>
  <div class="profile-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>Hồ sơ cá nhân</span>
        </div>
      </template>

      <el-form :model="form" label-width="120px">
        <el-form-item label="Họ tên">
          <el-input v-model="form.full_name" />
        </el-form-item>

        <el-form-item label="Số điện thoại">
          <el-input v-model="form.phone" />
        </el-form-item>

        <el-form-item label="Cập nhật avatar">
          <el-radio-group v-model="uploadMode">
            <el-radio :value="'link'">Nhập đường dẫn</el-radio>
            <el-radio :value="'file'">Tải ảnh từ máy</el-radio>
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
              style="width: 100px; margin-top: 10px"
            />
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="default" @click="goBack" class="back-button">
            ← Quay lại Dashboard
          </el-button>
          <el-button type="primary" @click="updateProfile">Lưu thay đổi</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import Navbar from "@/components/Navbar.vue";
const router = useRouter();

const form = ref({
  full_name: "",
  phone: "",
  avatar_url: "",
});

onMounted(async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:3000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Raw response:", res.data);
    form.value.full_name = res.data.full_name || res.data.name || "";
    form.value.phone = res.data.phone || "";
    form.value.avatar_url = res.data.avatar || res.data.avatar_url || "";
  } catch (err) {
    console.error("Không lấy được thông tin user:", err);
  }
});

const updateProfile = async () => {
  try {
    const token = localStorage.getItem("token");

    // Nếu dùng file, upload trước
    if (uploadMode.value === "file" && selectedFile.value) {
      const formData = new FormData();
      formData.append("image", selectedFile.value);
      const uploadRes = await axios.post("http://localhost:3000/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      form.value.avatar_url = uploadRes.data.imageUrl;
    }

    // Cập nhật profile
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

const goBack = () => {
  router.push("/dashboard");
};

const uploadMode = ref("link"); // mặc định dùng link
const selectedFile = ref(null);
const previewUrl = ref("");

const handleFileChange = (e) => {
  selectedFile.value = e.target.files[0];
  previewUrl.value = URL.createObjectURL(selectedFile.value);
};
</script>

<style scoped>
.profile-container {
  max-width: 600px;
  margin: 40px auto;
}

.back-button {
  margin-bottom: 20px;
}

.back-button {
  align-items: center;
  margin: 0;
}
</style>
