<template>
  <div class="dashboard">
    <h2>Tổng quan</h2>
    <div class="stats">
      <div class="stat-card">
        <div class="icon-box green">
          <el-icon><Money /></el-icon>
        </div>
        <div class="text">
          <h3>Doanh thu hôm nay</h3>
          <p class="value">{{ formatCurrency(stats["revenue.today"]) }}</p>
          <p class="growth">{{ revenueGrowth }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box blue">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="text">
          <h3>Đơn hàng hôm nay</h3>
          <p class="value">{{ stats["orders.count"] }}</p>
          <p class="growth">{{ ordersGrowth }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box purple">
          <el-icon><User /></el-icon>
        </div>
        <div class="text">
          <h3>Khách hàng</h3>
          <p class="value">{{ stats["users.total"] }}</p>
          <p class="growth">{{ usersGrowth }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box orange">
          <el-icon><KnifeFork /></el-icon>
        </div>
        <div class="text">
          <h3>Món ăn bán ra</h3>
          <p class="value">{{ stats["dishes.sold"] }}</p>
          <p class="growth">{{ dishesGrowth }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Money, TrendCharts, User, KnifeFork } from "@element-plus/icons-vue";
import axios from "axios";
import { ElMessage } from "element-plus";

// Dữ liệu thống kê
const stats = ref({
  "revenue.today": 0,
  "orders.count": 0,
  "users.total": 0,
  "dishes.sold": 0,
});

// Giá trị tăng trưởng (có thể tính từ API hoặc hardcode tạm thời)
const revenueGrowth = ref("+12.5%");
const ordersGrowth = ref("+5.2%");
const usersGrowth = ref("+8.5%");
const dishesGrowth = ref("+18.3%");

// Format tiền tệ
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Lấy dữ liệu từ API khi component được mount
onMounted(async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      "http://localhost:3000/api/admin/dashboard/overview",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    stats.value = response.data;
  } catch (error) {
    console.error("Không thể lấy dữ liệu dashboard:", error);
    ElMessage.error("Không thể lấy dữ liệu thống kê");
  }
});
</script>

<style scoped>
.dashboard {
  padding: 20px 30px;
  width: 100%;
  box-sizing: border-box;
}

h2 {
  margin-bottom: 20px;
  color: #78350f;
  font-weight: 600;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  flex: 1;
  min-width: 240px;
}

.icon-box {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-box .el-icon {
  font-size: 24px;
  color: white;
}

.green {
  background: #10b981;
}

.blue {
  background: #3b82f6;
}

.purple {
  background: #8b5cf6;
}

.orange {
  background: #f59e0b;
}

.text h3 {
  font-size: 16px;
  color: #64748b;
  margin: 0 0 10px;
}

.value {
  font-size: 28px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.growth {
  color: #10b981;
  margin: 5px 0 0;
  font-size: 14px;
}
</style>
