<template>
  <div ref="tablesGridRef" class="tables-grid">
    <div
      v-for="table in displayedTables"
      :key="table.table_id"
      :class="['table-card', getStatusClass(table.status)]"
      @click="viewTableDetail(table)"
    >
      <div class="table-header">
        <h3>B{{ table.table_number }}</h3>
        <el-tag :type="getTagType(table.status)">{{
          getStatusText(table.status)
        }}</el-tag>
      </div>

      <div class="table-info">
        <p class="capacity">{{ table.capacity }} chỗ</p>

        <!-- Bàn đang có khách (có đơn active): hiện số khách, giờ đến, doanh thu tạm tính -->
        <div v-if="table.activeOrder" class="reservation-info">
          <p class="guests">
            <el-icon><User /></el-icon>
            {{ table.activeOrder.number_of_guests }} khách
          </p>
          <p class="time">
            <el-icon><Clock /></el-icon>
            {{ formatTime(table.activeOrder.arrival_time) }}
          </p>
          <p class="revenue">{{ formatCurrency(table.totalRevenue) }}</p>
        </div>

        <!-- Bàn trống nhưng có đơn đặt trước sắp tới: hiện nhắc "đặt trước lúc..." -->
        <div v-else-if="table.upcomingOrder" class="upcoming-reservation-info">
          <p class="status-ready-text">Sẵn sàng phục vụ</p>
          <p class="upcoming-badge">
            <el-icon><Clock /></el-icon>
            Đặt trước lúc {{ formatTime(table.upcomingOrder.arrival_time) }}
            · {{ table.upcomingOrder.number_of_guests }} khách
          </p>
        </div>

        <!-- Không có đơn: hiện dòng chữ trạng thái theo màu (trống/đã đặt/đang phục vụ/cần dọn) -->
        <div v-else class="empty-info">
          <p
            :class="{
              'status-ready-text': normalizeTableStatus(table.status) === 'available',
              'status-reserved-text': normalizeTableStatus(table.status) === 'pre-ordered',
              'status-occupied-text': normalizeTableStatus(table.status) === 'occupied',
              'status-cleaning-text': normalizeTableStatus(table.status) === 'cleaning',
            }"
          >
            {{
              normalizeTableStatus(table.status) === 'cleaning'
                ? 'Cần dọn bàn'
                : normalizeTableStatus(table.status) === 'available'
                ? 'Sẵn sàng phục vụ'
                : normalizeTableStatus(table.status) === 'pre-ordered'
                  ? 'Đã đặt'
                  : 'Đang phục vụ'
            }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// TablesGrid — lưới thẻ bàn (sơ đồ bàn). Mỗi thẻ hiện số bàn, trạng thái, sức chứa và thông tin đơn (nếu có).
// tablesGridRef gắn vào div lưới để composable đo kích thước và tính số bàn/trang.
import { User, Clock } from "@element-plus/icons-vue";
import { useTablesContext } from "../composables/tablesContext";

const {
  tablesGridRef,        // ref DOM lưới (để đo kích thước)
  displayedTables,      // các bàn của trang hiện tại
  getStatusClass,       // class CSS theo trạng thái bàn
  getTagType,           // màu tag theo trạng thái
  getStatusText,        // nhãn tiếng Việt của trạng thái
  normalizeTableStatus, // chuẩn hóa trạng thái để so sánh
  formatCurrency,
  formatTime,
  viewTableDetail,      // mở chi tiết khi click vào thẻ bàn
} = useTablesContext();
</script>
