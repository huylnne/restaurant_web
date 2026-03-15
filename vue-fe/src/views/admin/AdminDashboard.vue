<template>
  <div class="dashboard">
    <h2>Tổng quan</h2>
    <div class="stats">
      <div v-if="showFinancials" class="stat-card">
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
    <div class="two_charts">
      <div v-if="showFinancials" class="weekly-stats">
        <h3>Doanh thu trong tuần</h3>
        <Bar
          v-if="weeklyLabels.length"
          :data="{
            labels: weeklyLabels,
            datasets: [
              {
                label: 'Doanh thu',
                backgroundColor: '#a16500',
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
            Bàn trống: {{ tableStatus.available }} bàn
          </li>
          <li>
            <span class="status-color serving"></span>
            Đang phục vụ: {{ tableStatus.occupied }} bàn
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
            <th v-if="showFinancials">Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(dish, index) in topDishes" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ dish.name }}</td>
            <td>{{ dish.category }}</td>
            <td>{{ dish.soldCount }}</td>
            <td v-if="showFinancials" class="revenue">{{ formatCurrency(dish.revenue) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { Money, TrendCharts, User, KnifeFork } from "@element-plus/icons-vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { getCurrentRole } from "@/utils/auth.js";
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
    return today > 0 ? "+100%" : "+0%";
  }
  const growth = ((today - yesterday) / yesterday) * 100;
  return (growth >= 0 ? "+" : "") + growth.toFixed(1) + "%";
}

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

const showFinancials = computed(() => getCurrentRole() === "admin");

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Đổi tên các trường cho đồng bộ với backend
const tableStatus = ref({
  available: 0,
  occupied: 0,
  reserved: 0,
});

onMounted(async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      "http://localhost:3000/api/admin/dashboard/summary",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    stats.value = {
      "revenue.today": response.data.todayRevenue ?? 0,
      "revenue.yesterday": response.data.yesterdayRevenue ?? 0,
      "orders.count": response.data.totalOrders ?? 0,
      "orders.yesterday": response.data.yesterdayOrders ?? 0,
      "users.total": response.data.totalCustomers ?? 0,
      "users.yesterday": response.data.yesterdayCustomers ?? 0,
      "dishes.sold": response.data.totalItems ?? 0,
      "dishes.yesterday": response.data.yesterdayItems ?? 0,
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

    const weeklyRes = await axios.get(
      "http://localhost:3000/api/admin/dashboard/weekly-revenue",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const weeklyList = Array.isArray(weeklyRes.data) ? weeklyRes.data : [];
    weeklyLabels.value = weeklyList.map((item) => item.day);
    weeklyData.value = weeklyList.map((item) => item.revenue);

    const topDishesRes = await axios.get(
      "http://localhost:3000/api/admin/dashboard/top-dishes",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    topDishes.value = topDishesRes.data;

    // Lấy đúng trường từ backend
    const tableStatusRes = await axios.get(
      "http://localhost:3000/api/admin/dashboard/table-status",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = tableStatusRes.data;
    tableStatus.value = {
      available: data.availableTables || 0,
      occupied: data.occupiedTables || 0,
      reserved: data.reservedTables || 0,
    };

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
                tableStatus.value.available,
                tableStatus.value.occupied,
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
  padding: var(--hl-space-lg) var(--hl-space-xl);
  width: 100%;
  box-sizing: border-box;
  gap: var(--hl-space-xl);
  background: var(--hl-admin-bg);
  min-height: 100%;
}
.two_charts {
  display: flex;
  flex-direction: row;
  flex: 1;
  width: 100%;
  gap: 20px;
}
h2 {
  margin-bottom: var(--hl-space-lg);
  color: var(--hl-primary);
  font-weight: 600;
  font-size: 1.5rem;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hl-space-lg);
}
.stat-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-md);
  padding: var(--hl-space-lg);
  display: flex;
  align-items: center;
  gap: var(--hl-space-lg);
  box-shadow: var(--hl-shadow-card);
  flex: 1;
  min-width: 240px;
  border: 1px solid var(--hl-admin-border);
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
  background: var(--hl-admin-success);
}
.blue {
  background: var(--hl-admin-info);
}
.purple {
  background: #6b4c9a;
}
.orange {
  background: var(--hl-primary);
}
.text h3 {
  font-size: 1rem;
  color: var(--hl-text-muted);
  margin: 0 0 var(--hl-space-sm);
}
.value {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--hl-text);
  margin: 0;
}
.growth {
  margin: var(--hl-space-xs) 0 0;
  font-size: 14px;
  font-weight: 600;
}
.growth-positive {
  color: var(--hl-admin-success);
}
.growth-negative {
  color: var(--hl-error);
}
.growth-neutral {
  color: var(--hl-text-muted);
}
.weekly-stats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: var(--hl-admin-card);
  padding: var(--hl-space-md);
  width: 70%;
  border-radius: var(--hl-radius-lg);
  box-shadow: var(--hl-shadow-card);
  border: 1px solid var(--hl-admin-border);
}
.weekly-stats canvas {
  width: 100%;
  height: 500px;
}
.weekly-stats h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--hl-primary);
  margin-bottom: var(--hl-space-md);
}
.top-dishes {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-lg);
  padding: var(--hl-space-lg);
  margin-top: var(--hl-space-xl);
  box-shadow: var(--hl-shadow-card);
  border: 1px solid var(--hl-admin-border);
}
.top-dishes h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--hl-space-lg);
  color: var(--hl-primary);
}
.top-dishes table {
  width: 100%;
  border-collapse: collapse;
}
.top-dishes thead th {
  background: var(--hl-bg-muted);
  text-align: left;
  padding: var(--hl-space-md);
  font-weight: 600;
  color: var(--hl-text-muted);
}
.top-dishes tbody tr {
  border-bottom: 1px solid var(--hl-admin-border);
}
.top-dishes tbody td {
  padding: var(--hl-space-md);
  color: var(--hl-text);
}
.top-dishes tbody td.revenue {
  color: var(--hl-admin-success);
  font-weight: 600;
}
.table-status {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-lg);
  padding-left: var(--hl-space-md);
  box-shadow: var(--hl-shadow-card);
  flex: 1;
  border: 1px solid var(--hl-admin-border);
}
@media (max-width: 768px) {
  .top-dishes h3 {
    font-size: 1.125rem;
  }
  .top-dishes table {
    font-size: 14px;
  }
}
.table-status h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--hl-space-lg);
  color: var(--hl-primary);
}
.status-chart {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}
.status-list {
  margin-top: var(--hl-space-lg);
  list-style: none;
  padding: 0;
}
.status-list li {
  display: flex;
  align-items: center;
  margin-bottom: var(--hl-space-sm);
}
.status-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: var(--hl-space-sm);
}
.status-color.empty {
  background: var(--hl-admin-success);
}
.status-color.serving {
  background: var(--hl-primary);
}
.status-color.reserved {
  background: var(--hl-error);
}
</style>
