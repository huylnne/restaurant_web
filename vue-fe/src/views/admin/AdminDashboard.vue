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
          <p class="growth" :class="getGrowthClass(revenueGrowth)">{{ revenueGrowth }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box blue">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="text">
          <h3>Đơn hàng hôm nay</h3>
          <p class="value">{{ stats["orders.count"] }}</p>
          <p class="growth" :class="getGrowthClass(ordersGrowth)">{{ ordersGrowth }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box purple">
          <el-icon><User /></el-icon>
        </div>
        <div class="text">
          <h3>Khách hàng</h3>
          <p class="value">{{ stats["users.total"] }}</p>
          <p class="growth" :class="getGrowthClass(usersGrowth)">{{ usersGrowth }}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box orange">
          <el-icon><KnifeFork /></el-icon>
        </div>
        <div class="text">
          <h3>Món ăn bán ra</h3>
          <p class="value">{{ stats["dishes.sold"] }}</p>
          <p class="growth" :class="getGrowthClass(dishesGrowth)">{{ dishesGrowth }}</p>
        </div>
      </div>
    </div>
    <!-- Biểu đồ doanh thu trong tuần -->
    <div class="two_charts">
      <div class="weekly-stats">
        <h3>Doanh thu trong tuần</h3>
        <Bar
          v-if="weeklyLabels.length"
          :data="{
            labels: weeklyLabels,
            datasets: [
              {
                label: 'Doanh thu',
                backgroundColor: '#f97316',
                data: weeklyData,
                borderRadius: 8,
                barPercentage: 0.6,
              },
            ],
          }"
          :options="chartOptions"
          style="max-width: 800px; margin: 0 auto"
        />
      </div>
      <div class="table-status">
        <h3>Tình trạng bàn ăn</h3>
        <div class="status-chart">
          <canvas id="tableStatusChart"></canvas>
        </div>
        <ul class="status-list">
          <li>
            <span class="status-color empty"></span>
            Bàn trống: {{ tableStatus.empty }} bàn
          </li>
          <li>
            <span class="status-color serving"></span>
            Đang phục vụ: {{ tableStatus.serving }} bàn
          </li>
          <li>
            <span class="status-color reserved"></span>
            Đã đặt trước: {{ tableStatus.reserved }} bàn
          </li>
        </ul>
      </div>
    </div>
    <div class="top-dishes">
      <h3>Top món ăn bán chạy</h3>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên món</th>
            <th>Loại món</th>
            <th>Đã bán</th>
            <th>Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(dish, index) in topDishes" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ dish.name }}</td>
            <td>{{ dish.category }}</td>
            <td>{{ dish.soldCount }}</td>
            <td class="revenue">{{ formatCurrency(dish.revenue) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { Money, TrendCharts, User, KnifeFork } from "@element-plus/icons-vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar } from "vue-chartjs";
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement);

const weeklyLabels = ref([]);
const weeklyData = ref([]);
const topDishes = ref([]);
// Dữ liệu thống kê
const stats = ref({
  "revenue.today": 0,
  "revenue.yesterday": 0,
  "orders.count": 0,
  "orders.yesterday": 0,
  "users.total": 0,
  "users.yesterday": 0,
  "dishes.sold": 0,
  "dishes.yesterday": 0,
});

function calcGrowth(today, yesterday) {
  if (!yesterday || yesterday === 0) {
    return "+0%"; // ✅ Trả về +0% nếu không có dữ liệu hôm qua
  }
  const growth = ((today - yesterday) / yesterday) * 100;
  return (growth >= 0 ? "+" : "") + growth.toFixed(1) + "%";
}

// ✅ Hàm xác định class CSS cho growth (xanh = tăng, đỏ = giảm, xám = không đổi)
function getGrowthClass(growthText) {
  if (growthText === "Mới" || growthText.startsWith("+")) {
    return "growth-positive";
  } else if (growthText.startsWith("-")) {
    return "growth-negative";
  }
  return "growth-neutral";
}

const revenueGrowth = ref("+0%");
const ordersGrowth = ref("+0%");
const usersGrowth = ref("+0%");
const dishesGrowth = ref("+0%");

// Format tiền tệ
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const tableStatus = ref({
  empty: 0,
  serving: 0,
  reserved: 0,
});

onMounted(async () => {
  try {
    const token = localStorage.getItem("token");

    // Lấy dữ liệu tổng quan
    const response = await axios.get(
      "http://localhost:3000/api/admin/dashboard/summary",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    stats.value = {
      "revenue.today": response.data.todayRevenue,
      "revenue.yesterday": response.data.yesterdayRevenue,
      "orders.count": response.data.totalOrders,
      "orders.yesterday": response.data.yesterdayOrders,
      "users.total": response.data.totalCustomers,
      "users.yesterday": response.data.yesterdayCustomers,
      "dishes.sold": response.data.totalItems,
      "dishes.yesterday": response.data.yesterdayItems,
    };
    revenueGrowth.value = calcGrowth(
      stats.value["revenue.today"],
      stats.value["revenue.yesterday"]
    );
    ordersGrowth.value = calcGrowth(
      stats.value["orders.count"],
      stats.value["orders.yesterday"]
    );
    usersGrowth.value = calcGrowth(
      stats.value["users.total"],
      stats.value["users.yesterday"]
    );
    dishesGrowth.value = calcGrowth(
      stats.value["dishes.sold"],
      stats.value["dishes.yesterday"]
    );

    // Lấy dữ liệu doanh thu tuần
    const weeklyRes = await axios.get(
      "http://localhost:3000/api/admin/dashboard/weekly-revenue",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    weeklyLabels.value = weeklyRes.data.map((item) => item.day);
    weeklyData.value = weeklyRes.data.map((item) => item.revenue);

    // Lấy dữ liệu top món ăn bán chạy
    const topDishesRes = await axios.get(
      "http://localhost:3000/api/admin/dashboard/top-dishes",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    topDishes.value = topDishesRes.data;

    // Lấy dữ liệu tình trạng bàn ăn
    const tableStatusRes = await axios.get(
      "http://localhost:3000/api/admin/dashboard/table-status",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = tableStatusRes.data;
    tableStatus.value = {
      empty: data.empty || 0,
      serving: data.occupied || 0,
      reserved: data.reserved || 0,
    };

    // ✅ Đợi DOM cập nhật xong, sau đó vẽ biểu đồ
    await nextTick();

    const ctx = document.getElementById("tableStatusChart")?.getContext("2d");
    if (ctx) {
      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Bàn trống", "Đang phục vụ", "Đã đặt trước"],
          datasets: [
            {
              data: [
                tableStatus.value.empty,
                tableStatus.value.serving,
                tableStatus.value.reserved,
              ],
              backgroundColor: ["#10b981", "#f97316", "#ef4444"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return context.label + ": " + context.parsed + " bàn";
                },
              },
            },
          },
        },
      });
    }
  } catch (error) {
    console.error("Không thể lấy dữ liệu dashboard:", error);
    ElMessage.error("Không thể lấy dữ liệu thống kê");
  }
});

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: { label: (ctx) => ctx.parsed.y.toLocaleString("vi-VN") + "đ" },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => value.toLocaleString("vi-VN") + "đ",
      },
    },
  },
};
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  padding: 20px 30px;
  width: 100%;
  box-sizing: border-box;
  gap: 30px;
}

.two_charts {
  display: flex;
  flex-direction: row;
  flex: 1;
  width: 100%;
  gap: 20px;
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
  margin: 5px 0 0;
  font-size: 14px;
  font-weight: 600;
}

/* ✅ CSS cho các trạng thái growth */
.growth-positive {
  color: #10b981; /* Xanh lá = tăng trưởng */
}

.growth-negative {
  color: #ef4444; /* Đỏ = giảm */
}

.growth-neutral {
  color: #64748b; /* Xám = không đổi hoặc "Mới" */
}

.weekly-stats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #fff;
  padding: 15px;
  width: 70%;
}

.weekly-stats canvas {
  width: 100%;
  height: 500px;
}

.weekly-stats h3 {
  font-size: 20px;
  font-weight: 600;
  color: #78350f;
}

.top-dishes {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-top: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.top-dishes h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #78350f;
}

.top-dishes table {
  width: 100%;
  border-collapse: collapse;
}

.top-dishes thead th {
  background: #f3f4f6;
  text-align: left;
  padding: 12px;
  font-weight: 600;
  color: #64748b;
}

.top-dishes tbody tr {
  border-bottom: 1px solid #e5e7eb;
}

.top-dishes tbody td {
  padding: 12px;
  color: #1e293b;
}

.top-dishes tbody td.revenue {
  color: #10b981;
  font-weight: 600;
}

.table-status {
  background: white;
  border-radius: 12px;
  padding-left: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  flex: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .top-dishes h3 {
    font-size: 18px;
  }

  .top-dishes table {
    font-size: 14px;
  }
}

.table-status {
  background: white;
  border-radius: 12px;

  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  flex: 1;
}

.table-status h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #78350f;
}

.status-chart {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

.status-list {
  margin-top: 20px;
  list-style: none;
  padding: 0;
}

.status-list li {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.status-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
}

.status-color.empty {
  background: #10b981;
}

.status-color.serving {
  background: #f97316;
}

.status-color.reserved {
  background: #ef4444;
}
</style>
