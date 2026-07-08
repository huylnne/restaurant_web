<template>
  <el-dialog v-model="showCreateOrderDialog" title="Tạo đơn hàng" width="560px">
    <div v-loading="menuItemsLoading" class="create-order-form">
      <p v-if="selectedTable" class="table-info">Bàn B{{ selectedTable?.table_number }}</p>
      <el-scrollbar max-height="320px">
        <div class="menu-list">
          <div v-for="item in menuItemsForOrder" :key="item.item_id" class="menu-row">
            <span class="menu-name">{{ item.name }}</span>
            <el-input-number
              v-model="orderQuantities[item.item_id]"
              :min="0"
              :max="20"
              size="small"
              style="width: 120px"
            />
          </div>
        </div>
      </el-scrollbar>
      <p v-if="!hasOrderItemsSelected" class="hint">Chọn ít nhất một món với số lượng > 0</p>
    </div>
    <template #footer>
      <el-button @click="showCreateOrderDialog = false">Hủy</el-button>
      <el-button type="primary" :disabled="!hasOrderItemsSelected" @click="submitCreateOrder">
        Tạo đơn
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// CreateOrderDialog — gọi món tại bàn: liệt kê thực đơn với ô chọn số lượng; nút "Tạo đơn" khóa khi chưa chọn món nào.
import { useTablesContext } from "../composables/tablesContext";

const {
  showCreateOrderDialog, // đóng/mở dialog
  menuItemsLoading,      // đang tải thực đơn
  selectedTable,         // bàn đang tạo đơn
  menuItemsForOrder,     // danh sách món để chọn
  orderQuantities,       // map item_id → số lượng đang chọn
  hasOrderItemsSelected, // có món nào SL>0 chưa (bật/tắt nút)
  submitCreateOrder,     // gửi đơn
} = useTablesContext();
</script>
