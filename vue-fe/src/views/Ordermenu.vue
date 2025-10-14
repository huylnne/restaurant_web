<template>
  <div>
    <UserNavbar />

    <el-card class="order-menu-card">
      <h2>Đặt món trước cho bàn đã đặt</h2>
      <el-row :gutter="16">
        <el-col v-for="item in menu" :key="item.item_id" :span="8" style="display: flex">
          <el-card class="menu-item-card" style="flex: 1">
            <div class="menu-item-content">
              <img
                :src="item.image_url"
                style="width: 100%; height: 140px; object-fit: cover"
              />
              <h3>{{ item.name }}</h3>
              <p>{{ item.description }}</p>
              <p>Giá: {{ parseInt(item.price).toLocaleString("vi-VN") }} đ</p>

              <el-input-number
                v-model="order[item.item_id]"
                :min="0"
                :max="20"
                label="Số lượng"
                class="input-bottom"
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-button
        type="primary"
        style="margin-top: 24px"
        @click="submitOrder"
        :disabled="!hasItemSelected"
        >Đặt món</el-button
      >
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import UserNavbar from "@/components/UserNavbar.vue";

const route = useRoute();
const router = useRouter();
const reservation_id = route.query.reservation_id;

const menu = ref([]);
const order = ref({}); 


onMounted(async () => {
  try {
    const res = await axios.get("/api/menu-items", { params: { page: 1, limit: 100 } });
    menu.value = res.data.items || [];

    menu.value.forEach((item) => {
      order.value[item.item_id] = 0;
    });
  } catch (err) {
    ElMessage.error("Không lấy được thực đơn!");
  }
});


const hasItemSelected = computed(() => Object.values(order.value).some((qty) => qty > 0));

const submitOrder = async () => {
  const items = Object.entries(order.value)
    .filter(([id, qty]) => qty > 0)
    .map(([item_id, quantity]) => ({ item_id: Number(item_id), quantity }));

  if (!items.length) {
    ElMessage.warning("Chọn ít nhất 1 món để đặt!");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    await axios.post(
      "/api/orders",
      { reservation_id, items },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Đặt món trước thành công!");
    router.push("profile");
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Đặt món thất bại!");
  }
};
</script>

<style scoped>
.order-menu-card {
  max-width: 900px;
  margin: 40px auto;
  padding: 24px;
  background: #f9fafc;
}
.menu-item-card {
  margin-bottom: 20px;
  height: 350px;
  position: relative;
  padding-bottom: 60px;
}

.input-bottom {
  position: absolute;
  bottom: 16px;
  left: 16px;
}
</style>
