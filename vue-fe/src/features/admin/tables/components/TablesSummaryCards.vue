<template>
  <div class="summary-cards">
    <div class="summary-card orange-border">
      <div class="card-content">
        <h3>Tổng số bàn</h3>
        <p class="value">{{ summary.totalTables }} bàn</p>
      </div>
      <div class="card-icon orange">
        <el-icon><Grid /></el-icon>
      </div>
    </div>

    <div class="summary-card green-border">
      <div class="card-content">
        <h3>Bàn trống</h3>
        <p class="value green">{{ summary.availableTables }} bàn</p>
      </div>
      <div class="card-icon green">
        <el-icon><CircleCheck /></el-icon>
      </div>
    </div>

    <div class="summary-card orange-border">
      <div class="card-content">
        <h3>Đang phục vụ</h3>
        <p class="value orange">{{ summary.occupiedTables }} bàn</p>
      </div>
      <div class="card-icon orange">
        <el-icon><Clock /></el-icon>
      </div>
    </div>

    <div class="summary-card reserved-border">
      <div class="card-content">
        <h3>Đã đặt</h3>
        <p class="value reserved">{{ summary.reservedTables }} bàn</p>
      </div>
      <div class="card-icon reserved">
        <el-icon><Calendar /></el-icon>
      </div>
    </div>

    <div class="summary-card cleaning-border">
      <div class="card-content">
        <h3>Chờ dọn</h3>
        <p class="value cleaning">{{ summary.cleaningTables }} bàn</p>
      </div>
      <div class="card-icon cleaning">
        <el-icon><Refresh /></el-icon>
      </div>
    </div>

    <div v-if="userRole !== 'waiter'" class="summary-card yellow-border">
      <div class="card-content">
        <h3>Doanh thu hiện tại</h3>
        <p class="value yellow">{{ formatCurrency(summary.currentRevenue) }}</p>
      </div>
      <div class="card-icon yellow">
        <el-icon><Money /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
// TablesSummaryCards — dải thẻ thống kê ở đầu trang bàn (tổng/trống/đang phục vụ/đã đặt/chờ dọn/doanh thu).
// Lấy dữ liệu từ context dùng chung thay vì nhận props (xem provideTablesContext ở AdminTablesPage).
import {
  Grid,
  CircleCheck,
  Clock,
  Calendar,
  Money,
  Refresh,
} from "@element-plus/icons-vue";
import { useTablesContext } from "../composables/tablesContext";

// summary: các con số; userRole: để ẩn thẻ doanh thu với waiter; formatCurrency: định dạng tiền.
const { summary, userRole, formatCurrency } = useTablesContext();
</script>
