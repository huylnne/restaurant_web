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

        <div v-else-if="table.upcomingOrder" class="upcoming-reservation-info">
          <p class="status-ready-text">Sẵn sàng phục vụ</p>
          <p class="upcoming-badge">
            <el-icon><Clock /></el-icon>
            Đặt trước lúc {{ formatTime(table.upcomingOrder.arrival_time) }}
            · {{ table.upcomingOrder.number_of_guests }} khách
          </p>
        </div>

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
import { User, Clock } from "@element-plus/icons-vue";
import { useTablesContext } from "../composables/tablesContext";

const {
  tablesGridRef,
  displayedTables,
  getStatusClass,
  getTagType,
  getStatusText,
  normalizeTableStatus,
  formatCurrency,
  formatTime,
  viewTableDetail,
} = useTablesContext();
</script>
