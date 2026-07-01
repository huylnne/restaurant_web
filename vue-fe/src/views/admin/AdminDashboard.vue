<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>Tổng quan</h2>
      <AdminBranchSelect
        v-model="selectedBranchId"
        :branches="branches"
        :disabled="!isSuperAdmin"
        @change="fetchDashboardData"
      />
    </div>
    <div class="stats">
      <div v-if="showFinancials" class="stat-card hl-stat-card">
        <div class="icon-box green">
          <el-icon><Money /></el-icon>
        </div>
        <div class="text">
          <h3>Doanh thu hôm nay</h3>
          <p class="value">{{ formatCurrency(stats["revenue.today"]) }}</p>
          <p class="growth" :class="getGrowthClass(revenueGrowth)">{{ revenueGrowth }}</p>
        </div>
      </div>
      <div class="stat-card hl-stat-card">
        <div class="icon-box blue">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="text">
          <h3>Đơn hàng hôm nay</h3>
          <p class="value">{{ stats["orders.count"] }}</p>
          <p class="growth" :class="getGrowthClass(ordersGrowth)">{{ ordersGrowth }}</p>
        </div>
      </div>
      <div class="stat-card hl-stat-card">
        <div class="icon-box purple">
          <el-icon><User /></el-icon>
        </div>
        <div class="text">
          <h3>Khách hàng</h3>
          <p class="value">{{ stats["users.total"] }}</p>
          <p class="growth" :class="getGrowthClass(usersGrowth)">{{ usersGrowth }}</p>
        </div>
      </div>
      <div class="stat-card hl-stat-card">
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
        <h3>Doanh thu 7 ngày gần nhất</h3>
        <div
          v-show="weeklyLabels.length"
          ref="weeklyChartRef"
          class="chart-canvas"
        />
      </div>
      <div class="table-status">
        <h3>Tình trạng bàn ăn</h3>
        <div class="status-chart">
          <div ref="tableStatusChartRef" class="chart-canvas chart-canvas--donut" />
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
            Đã đặt: {{ tableStatus.reserved }} bàn
          </li>
          <li>
            <span class="status-color cleaning"></span>
            Chờ dọn: {{ tableStatus.cleaning }} bàn
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
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from "vue";
import { Money, TrendCharts, User, KnifeFork } from "@element-plus/icons-vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { getCurrentRole } from "@/utils/auth.js";
import { loadEcharts } from "@/utils/echartsLoader";
import { useAdminBranchScope } from "@/features/admin/shared/composables/useAdminBranchScope";
import AdminBranchSelect from "@/features/admin/shared/components/AdminBranchSelect.vue";
import { formatCurrency } from "@/utils/format";
import { API_ORIGIN } from "@/config/api";
const API_BASE = API_ORIGIN;
const { branches, selectedBranchId, isSuperAdmin, fetchBranches } = useAdminBranchScope();

const weeklyChartRef = ref(null);
const tableStatusChartRef = ref(null);
const chartInstances = [];

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

const tableStatus = ref({
  available: 0,
  occupied: 0,
  reserved: 0,
  cleaning: 0,
});

async function renderChart(el, option) {
  if (!el) return null;
  const echarts = await loadEcharts();
  const existing = echarts.getInstanceByDom(el);
  const chart = existing || echarts.init(el);
  chart.setOption(option, true);
  if (!chartInstances.includes(chart)) chartInstances.push(chart);
  return chart;
}

function disposeCharts() {
  chartInstances.forEach((c) => c?.dispose());
  chartInstances.length = 0;
}

const fetchDashboardData = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      `${API_BASE}/api/admin/dashboard/summary`,
      {
        params: { branchId: selectedBranchId.value },
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
      `${API_BASE}/api/admin/dashboard/weekly-revenue`,
      { params: { branchId: selectedBranchId.value }, headers: { Authorization: `Bearer ${token}` } }
    );
    const weeklyList = Array.isArray(weeklyRes.data) ? weeklyRes.data : [];
    weeklyLabels.value = weeklyList.map((item) => item.day);
    weeklyData.value = weeklyList.map((item) => item.revenue);

    const topDishesRes = await axios.get(
      `${API_BASE}/api/admin/dashboard/top-dishes`,
      { params: { branchId: selectedBranchId.value }, headers: { Authorization: `Bearer ${token}` } }
    );
    topDishes.value = topDishesRes.data;

    // Lấy đúng trường từ backend
    const tableStatusRes = await axios.get(
      `${API_BASE}/api/admin/dashboard/table-status`,
      { params: { branchId: selectedBranchId.value }, headers: { Authorization: `Bearer ${token}` } }
    );
    const data = tableStatusRes.data;
    tableStatus.value = {
      available: data.availableTables || 0,
      occupied: data.occupiedTables || 0,
      reserved: data.reservedTables || 0,
      cleaning: data.cleaningTables || 0,
    };

    await nextTick();
    await drawCharts();
  } catch (error) {
    console.error("Không thể lấy dữ liệu dashboard:", error);
    ElMessage.error("Không thể lấy dữ liệu thống kê");
  }
};

async function drawCharts() {
  await drawWeeklyChart();
  await drawTableStatusChart();
}

async function drawWeeklyChart() {
  if (!showFinancials.value || !weeklyChartRef.value || !weeklyLabels.value.length) return;
  await renderChart(weeklyChartRef.value, {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/>${formatCurrency(p.value)}`;
      },
    },
    grid: { left: 48, right: 16, top: 24, bottom: 32 },
    xAxis: { type: "category", data: weeklyLabels.value },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (v) => `${(v / 1000).toFixed(0)}K` },
    },
    series: [
      {
        type: "bar",
        data: weeklyData.value,
        itemStyle: { color: "#a16500", borderRadius: [8, 8, 0, 0] },
        barWidth: "50%",
      },
    ],
  });
}

async function drawTableStatusChart() {
  if (!tableStatusChartRef.value) return;
  await renderChart(tableStatusChartRef.value, {
    tooltip: {
      trigger: "item",
      formatter: (p) => `${p.name}: ${p.value} bàn`,
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "50%"],
        label: { show: false },
        data: [
          { name: "Bàn trống", value: tableStatus.value.available, itemStyle: { color: "#10b981" } },
          { name: "Đang phục vụ", value: tableStatus.value.occupied, itemStyle: { color: "#f97316" } },
          { name: "Đã đặt", value: tableStatus.value.reserved, itemStyle: { color: "#3b82f6" } },
          { name: "Chờ dọn", value: tableStatus.value.cleaning, itemStyle: { color: "#94a3b8" } },
        ],
      },
    ],
  });
}

onMounted(async () => {
  await fetchBranches();
  await fetchDashboardData();
});

onBeforeUnmount(() => {
  disposeCharts();
});
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  padding: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  gap: var(--hl-space-xl);
  background: var(--hl-admin-bg);
  min-height: 0;
}

.chart-canvas {
  width: 100%;
  max-width: 800px;
  height: 280px;
  margin: 0 auto;
}

.chart-canvas--donut {
  max-width: 100%;
  height: 200px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--hl-space-md);
}
.branch-select {
  width: 220px;
}
.two_charts {
  display: flex;
  flex-direction: row;
  flex: 1;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  gap: 20px;
}
h2 {
  margin-bottom: 0;
  color: var(--hl-secondary);
  font-family: var(--hl-font-display);
  font-weight: 700;
  font-size: 1.75rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--hl-admin-grid-min)), 1fr));
  gap: var(--hl-admin-grid-gap);
  width: 100%;
  max-width: 100%;
}
.stat-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-lg);
  padding: var(--hl-space-lg);
  display: flex;
  align-items: center;
  gap: var(--hl-space-lg);
  box-shadow: var(--hl-shadow-card);
  min-width: 0;
  border: 1px solid var(--hl-admin-border);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--hl-shadow-md);
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
  background: linear-gradient(135deg, var(--hl-admin-success), #34d399);
}
.blue {
  background: linear-gradient(135deg, var(--hl-admin-info), #3b82f6);
}
.purple {
  background: linear-gradient(135deg, #6b4c9a, #8b5cf6);
}
.orange {
  background: var(--hl-gradient-primary);
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
  font-family: var(--hl-font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--hl-secondary);
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
  font-family: var(--hl-font-display);
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: var(--hl-space-lg);
  color: var(--hl-secondary);
}
.top-dishes table {
  width: 100%;
  border-collapse: collapse;
}
.top-dishes {
  overflow-x: auto;
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
  font-family: var(--hl-font-display);
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: var(--hl-space-lg);
  color: var(--hl-secondary);
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
  background: #3b82f6;
}
.status-color.cleaning {
  background: #94a3b8;
}
@media (max-width: 1024px) {
  .branch-select {
    width: 100%;
    max-width: 320px;
  }

  .two_charts {
    flex-direction: column;
  }

  .weekly-stats {
    width: 100%;
  }

  .stat-card {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--hl-space-sm);
  }

  .branch-select {
    max-width: none;
  }

  .weekly-stats,
  .table-status,
  .top-dishes {
    padding: var(--hl-space-md);
  }

  .weekly-stats canvas {
    height: 320px;
  }

  .value {
    font-size: 1.35rem;
  }

  .stat-card {
    padding: var(--hl-space-md);
    gap: var(--hl-space-sm);
  }

  .text h3 {
    font-size: 0.9rem;
    margin-bottom: 4px;
  }

  .growth {
    font-size: 12px;
  }
}
</style>
