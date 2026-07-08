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
// EditTableDialog — sửa bàn: số bàn, trạng thái, xem QR. Waiter không được đổi số bàn (chỉ trạng thái).
import { useTablesContext } from "../composables/tablesContext";

const {
  showEditDialogVisible, // đóng/mở dialog
  editTableForm,         // dữ liệu form sửa
  TABLE_CAPACITY,        // số ghế cố định (hiển thị, không cho sửa)
  userRole,              // để khóa ô số bàn với waiter
  selectedTable,         // bàn đang sửa (lấy qr_token...)
  openQrDialog,          // mở QR link bàn
  openPaymentQrDialog,   // mở QR thanh toán
  updateTable,           // gọi API cập nhật
} = useTablesContext();
</script>
