<template>
  <el-dialog v-model="showEditDialogVisible" title="Sửa thông tin bàn" width="500px">
    <el-form :model="editTableForm" label-width="120px">
      <el-form-item label="Số bàn">
        <el-input
          v-model.number="editTableForm.table_number"
          type="number"
          placeholder="Nhập số bàn"
          :disabled="userRole === 'waiter'"
        />
      </el-form-item>
      <el-form-item label="Số ghế">
        <el-input
          v-model.number="editTableForm.capacity"
          type="number"
          :placeholder="`${TABLE_CAPACITY} chỗ (cố định)`"
          disabled
        />
      </el-form-item>
      <el-form-item label="Trạng thái">
        <el-select v-model="editTableForm.status" placeholder="Chọn trạng thái">
          <el-option label="Trống" value="available" />
          <el-option label="Đã đặt" value="pre-ordered" />
          <el-option label="Đang phục vụ" value="occupied" />
          <el-option label="Chờ dọn" value="cleaning" />
        </el-select>
      </el-form-item>
      <el-form-item label="QR">
        <div class="qr-token-row">
          <el-tag type="info" size="small">{{ selectedTable?.qr_token || "—" }}</el-tag>
          <el-button
            v-if="selectedTable?.qr_token"
            size="small"
            @click="openQrDialog(selectedTable)"
          >
            Xem QR
          </el-button>
          <el-button
            v-if="selectedTable?.qr_token"
            size="small"
            type="primary"
            @click="openPaymentQrDialog(selectedTable)"
          >
            QR thanh toán
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showEditDialogVisible = false">Hủy</el-button>
      <el-button type="primary" @click="updateTable">Cập nhật</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { useTablesContext } from "../composables/tablesContext";

const {
  showEditDialogVisible,
  editTableForm,
  TABLE_CAPACITY,
  userRole,
  selectedTable,
  openQrDialog,
  openPaymentQrDialog,
  updateTable,
} = useTablesContext();
</script>
