<template>
  <div class="admin-reports">
    <div class="header">
      <div class="title-section">
        <h2>Báo cáo & Thống kê</h2>
        <p>Theo dõi doanh thu và hiệu suất hoạt động của chi nhánh</p>
      </div>
      <div class="filter-section">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="đến"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          format="DD/MM/YYYY"
          value-format="YYYY-MM-DD"
          @change="fetchAllData"
        />
        <el-button type="primary" @click="fetchAllData">
          <el-icon><Refresh /></el-icon>
          Làm mới
        </el-button>
      </div>
    </div>

    <!-- Cards tổng quan -->
    <div class="overview-cards">
      <div class="stat-card revenue">
        <div class="card-icon">
          <el-icon><Money /></el-icon>
        </div>
        <div class="card-content">
          <h3>Tổng doanh thu</h3>
          <p class="value">{{ formatCurrency(overview.totalRevenue) }}</p>
        </div>
      </div>

      <div class="stat-card orders">
        <div class="card-icon">
          <el-icon><ShoppingCart /></el-icon>
        </div>
        <div class="card-content">
          <h3>Đơn hoàn thành</h3>
          <p class="value">{{ overview.totalOrders }}</p>
        </div>
      </div>

      <div class="stat-card pending">
        <div class="card-icon">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="card-content">
          <h3>Đơn đang xử lý</h3>
          <p class="value">{{ overview.pendingOrders }}</p>
        </div>
      </div>

      <div class="stat-card customers">
        <div class="card-icon">
          <el-icon><User /></el-icon>
        </div>
        <div class="card-content">
          <h3>Khách hàng</h3>
          <p class="value">{{ overview.totalCustomers }}</p>
        </div>
      </div>
    </div>

    <!-- Biểu đồ -->
    <div class="charts-section">
      <!-- Doanh thu theo ngày -->
      <div class="chart-card">
        <h3>Doanh thu 7 ngày gần nhất</h3>
        <div ref="revenueChart" class="chart-container"></div>
      </div>

      <!-- Doanh thu theo danh mục -->
      <div class="chart-card">
        <h3>Doanh thu theo danh mục</h3>
        <div ref="categoryChart" class="chart-container"></div>
      </div>
    </div>

    <!-- Biểu đồ theo giờ và theo tháng -->
    <div class="charts-section">
      <div class="chart-card">
        <h3>Đơn hàng theo giờ (hôm nay)</h3>
        <div ref="hourChart" class="chart-container"></div>
      </div>

      <div class="chart-card">
        <h3>Doanh thu 6 tháng gần nhất</h3>
        <div ref="monthlyChart" class="chart-container"></div>
      </div>
    </div>

    <!-- Bảng món bán chạy -->
    <div class="table-section">
      <h3>Top 10 món bán chạy nhất</h3>
      <el-table :data="topSellingItems" stripe style="width: 100%">
        <el-table-column prop="name" label="Tên món" width="250" />
        <el-table-column prop="category" label="Danh mục" width="150" />
        <el-table-column label="Giá" width="150">
          <template #default="scope">
            {{ formatCurrency(scope.row.price) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_sold" label="Số lượng bán" width="150" />
        <el-table-column label="Doanh thu">
          <template #default="scope">
            {{ formatCurrency(scope.row.total_revenue) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Bảng khách hàng thân thiết -->
    <div class="table-section">
      <h3>Top 10 khách hàng thân thiết</h3>
      <el-table :data="topCustomers" stripe style="width: 100%">
        <el-table-column prop="full_name" label="Họ tên" width="200" />
        <el-table-column prop="phone" label="Số điện thoại" width="150" />
        <el-table-column prop="total_orders" label="Số đơn hàng" width="150" />
        <el-table-column label="Tổng chi tiêu">
          <template #default="scope">
            {{ formatCurrency(scope.row.total_spent) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Thống kê bàn -->
    <div class="table-stats-section">
      <h3>Thống kê bàn ăn</h3>
      <div class="table-stats-cards">
        <div class="stat-item">
          <span class="label">Tổng số bàn:</span>
          <span class="value">{{ tableStats.totalTables }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Bàn trống:</span>
          <span class="value green">{{ tableStats.availableTables }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Đang phục vụ:</span>
          <span class="value orange">{{ tableStats.occupiedTables }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Đã đặt trước:</span>
          <span class="value blue">{{ tableStats.reservedTables }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Tỷ lệ sử dụng:</span>
          <span class="value">{{ tableStats.occupancyRate }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { Money, ShoppingCart, Clock, User, Refresh } from "@element-plus/icons-vue";
import * as echarts from "echarts";

const dateRange = ref(null);
const overview = ref({
  totalRevenue: 0,
  totalOrders: 0,
  pendingOrders: 0,
  totalReservations: 0,
  totalCustomers: 0,
});

const revenueByDay = ref([]);
const topSellingItems = ref([]);
const revenueByCategory = ref([]);
const ordersByHour = ref([]);
const topCustomers = ref([]);
const tableStats = ref({
  totalTables: 0,
  availableTables: 0,
  occupiedTables: 0,
  reservedTables: 0,
  occupancyRate: 0,
});
const monthlyRevenue = ref([]);

const revenueChart = ref(null);
const categoryChart = ref(null);
const hourChart = ref(null);
const monthlyChart = ref(null);

// Format tiền
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

// Lấy token
const getToken = () => localStorage.getItem("token");

// Lấy tất cả dữ liệu
const fetchAllData = async () => {
  try {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };

    let params = { branchId: 1 };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    // Gọi các API
    const [
      overviewRes,
      revenueByDayRes,
      topSellingRes,
      categoryRes,
      hourRes,
      customersRes,
      tableStatsRes,
      monthlyRes,
    ] = await Promise.all([
      axios.get("http://localhost:3000/api/admin/reports/overview", {
        headers,
        params,
      }),
      axios.get("http://localhost:3000/api/admin/reports/revenue-by-day", {
        headers,
        params: { branchId: 1, days: 7 },
      }),
      axios.get("http://localhost:3000/api/admin/reports/top-selling", {
        headers,
        params: { branchId: 1, limit: 10 },
      }),
      axios.get("http://localhost:3000/api/admin/reports/revenue-by-category", {
        headers,
        params: { branchId: 1 },
      }),
      axios.get("http://localhost:3000/api/admin/reports/orders-by-hour", {
        headers,
        params: { branchId: 1 },
      }),
      axios.get("http://localhost:3000/api/admin/reports/top-customers", {
        headers,
        params: { branchId: 1, limit: 10 },
      }),
      axios.get("http://localhost:3000/api/admin/reports/table-stats", {
        headers,
        params: { branchId: 1 },
      }),
      axios.get("http://localhost:3000/api/admin/reports/monthly-revenue", {
        headers,
        params: { branchId: 1, months: 6 },
      }),
    ]);

    overview.value = overviewRes.data;
    revenueByDay.value = revenueByDayRes.data;
    topSellingItems.value = topSellingRes.data;
    revenueByCategory.value = categoryRes.data;
    ordersByHour.value = hourRes.data;
    topCustomers.value = customersRes.data;
    tableStats.value = tableStatsRes.data;
    monthlyRevenue.value = monthlyRes.data;

    // Vẽ biểu đồ
    drawCharts();
  } catch (error) {
    console.error("Lỗi lấy dữ liệu báo cáo:", error);
    ElMessage.error("Không thể lấy dữ liệu báo cáo");
  }
};

// Vẽ biểu đồ
const drawCharts = () => {
  drawRevenueChart();
  drawCategoryChart();
  drawHourChart();
  drawMonthlyChart();
};

// Biểu đồ doanh thu theo ngày
const drawRevenueChart = () => {
  const chart = echarts.init(revenueChart.value);
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        return `${params[0].name}<br/>${formatCurrency(params[0].value)}`;
      },
    },
    xAxis: {
      type: "category",
      data: revenueByDay.value.map((item) => item.date),
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value) => (value / 1000).toFixed(0) + "K",
      },
    },
    series: [
      {
        data: revenueByDay.value.map((item) => parseFloat(item.revenue)),
        type: "line",
        smooth: true,
        itemStyle: { color: "#f97316" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(249, 115, 22, 0.3)" },
            { offset: 1, color: "rgba(249, 115, 22, 0.05)" },
          ]),
        },
      },
    ],
  };
  chart.setOption(option);
};

// Biểu đồ doanh thu theo danh mục
const drawCategoryChart = () => {
  const chart = echarts.init(categoryChart.value);
  const option = {
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        return `${params.name}<br/>${formatCurrency(params.value)}`;
      },
    },
    legend: {
      orient: "vertical",
      left: "left",
    },
    series: [
      {
        type: "pie",
        radius: "60%",
        data: revenueByCategory.value.map((item) => ({
          name: item.category,
          value: parseFloat(item.revenue),
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };
  chart.setOption(option);
};

// Biểu đồ đơn hàng theo giờ
const drawHourChart = () => {
  const chart = echarts.init(hourChart.value);
  const option = {
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      data: ordersByHour.value.map((item) => `${item.hour}h`),
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        data: ordersByHour.value.map((item) => item.order_count),
        type: "bar",
        itemStyle: { color: "#10b981" },
      },
    ],
  };
  chart.setOption(option);
};

// Biểu đồ doanh thu theo tháng
const drawMonthlyChart = () => {
  const chart = echarts.init(monthlyChart.value);
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        return `${params[0].name}<br/>${formatCurrency(params[0].value)}`;
      },
    },
    xAxis: {
      type: "category",
      data: monthlyRevenue.value.map((item) => item.month),
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value) => (value / 1000000).toFixed(1) + "M",
      },
    },
    series: [
      {
        data: monthlyRevenue.value.map((item) => parseFloat(item.revenue)),
        type: "bar",
        itemStyle: { color: "#3b82f6" },
      },
    ],
  };
  chart.setOption(option);
};

onMounted(() => {
  fetchAllData();
});
</script>

<style scoped>
.admin-reports {
  padding: var(--hl-space-lg);
  background: var(--hl-admin-bg);
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hl-space-lg);
}

.title-section h2 {
  margin: 0 0 var(--hl-space-sm);
  color: var(--hl-primary);
  font-size: 1.75rem;
  font-weight: 700;
}

.title-section p {
  margin: 0;
  color: var(--hl-text-muted);
  font-size: 14px;
}

.filter-section {
  display: flex;
  gap: var(--hl-space-md);
}

/* Cards tổng quan */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--hl-space-lg);
  margin-bottom: var(--hl-space-lg);
}

.stat-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-xl);
  padding: var(--hl-space-lg);
  display: flex;
  align-items: center;
  gap: var(--hl-space-lg);
  box-shadow: var(--hl-shadow-md);
  border: 3px solid var(--hl-admin-border);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-card.revenue {
  border-color: #fde047;
}
.stat-card.orders {
  border-color: var(--hl-primary);
}
.stat-card.pending {
  border-color: var(--hl-admin-info);
}
.stat-card.customers {
  border-color: var(--hl-admin-success);
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
}

.revenue .card-icon {
  background: linear-gradient(135deg, var(--hl-admin-warning), #f59e0b);
}
.orders .card-icon {
  background: linear-gradient(135deg, var(--hl-primary), var(--hl-primary-light));
}
.pending .card-icon {
  background: linear-gradient(135deg, var(--hl-admin-info), #60a5fa);
}
.customers .card-icon {
  background: linear-gradient(135deg, var(--hl-admin-success), #34d399);
}

.card-content h3 {
  margin: 0 0 var(--hl-space-sm);
  font-size: 14px;
  color: var(--hl-text-muted);
  font-weight: 500;
}

.card-content .value {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--hl-text);
}

/* Biểu đồ */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: var(--hl-space-lg);
  margin-bottom: var(--hl-space-lg);
}

.chart-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-xl);
  padding: var(--hl-space-lg);
  box-shadow: var(--hl-shadow-md);
  border: 1px solid var(--hl-admin-border);
}

.chart-card h3 {
  margin: 0 0 var(--hl-space-md);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--hl-text);
}

.chart-container {
  width: 100%;
  height: 300px;
}

/* Bảng */
.table-section {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-xl);
  padding: var(--hl-space-lg);
  margin-bottom: var(--hl-space-lg);
  box-shadow: var(--hl-shadow-md);
  border: 1px solid var(--hl-admin-border);
}

.table-section h3 {
  margin: 0 0 var(--hl-space-md);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--hl-text);
}

/* Thống kê bàn */
.table-stats-section {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-xl);
  padding: var(--hl-space-lg);
  box-shadow: var(--hl-shadow-md);
  border: 1px solid var(--hl-admin-border);
}

.table-stats-section h3 {
  margin: 0 0 var(--hl-space-md);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--hl-text);
}

.table-stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--hl-space-md);
}

.stat-item {
  padding: var(--hl-space-md);
  background: var(--hl-admin-bg);
  border-radius: var(--hl-radius-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--hl-admin-border);
}

.stat-item .label {
  font-size: 14px;
  color: var(--hl-text-muted);
}

.stat-item .value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--hl-text);
}

.stat-item .value.green {
  color: var(--hl-admin-success);
}
.stat-item .value.orange {
  color: var(--hl-primary);
}
.stat-item .value.blue {
  color: var(--hl-admin-info);
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }
}
</style>
