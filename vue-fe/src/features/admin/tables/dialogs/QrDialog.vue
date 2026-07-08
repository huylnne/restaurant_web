<template>
  <el-dialog v-model="showQrDialog" :title="qrMode === 'payment' ? 'QR thanh toán' : 'QR cho bàn'" width="420px">
    <div v-if="qrSelectedTable" class="qr-dialog">
      <div class="qr-title">
        <strong>B{{ qrSelectedTable.table_number }}</strong>
      </div>
      <div class="qr-image-wrap">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code" class="qr-image" />
        <div v-else class="text-muted">Đang tạo QR...</div>
      </div>
      <div v-if="qrMode === 'payment'" class="qr-payment-meta">
        <div class="label">Số tiền</div>
        <div class="value">{{ formatCurrency(qrPaymentAmount) }}</div>
        <div class="label">Nội dung CK</div>
        <div class="value code">{{ qrPaymentCode || "Đang tạo..." }}</div>
        <el-tag
          v-if="qrPaymentStatus"
          :type="qrPaymentStatus === 'succeeded' ? 'success' : 'warning'"
          size="small"
        >
          {{ qrPaymentStatus === 'succeeded' ? 'Đã thanh toán' : 'Đang chờ SEPay xác nhận' }}
        </el-tag>
      </div>
      <div v-else class="qr-link">
        <div class="label">Link scan</div>
        <el-input :model-value="qrLink" readonly />
      </div>
    </div>
    <template #footer>
      <el-button v-if="qrMode !== 'payment'" @click="copyQrLink" :disabled="!qrLink">Copy link</el-button>
      <el-button type="primary" @click="showQrDialog = false">Đóng</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// QrDialog — hiển thị QR của bàn ở 2 chế độ: "link" (khách quét để gọi món) và "payment" (QR chuyển khoản).
// Chế độ payment hiển thị thêm số tiền, nội dung CK và trạng thái chờ SEPay xác nhận.
import { useTablesContext } from "../composables/tablesContext";

const {
  showQrDialog,      // đóng/mở dialog
  qrMode,            // "link" | "payment"
  qrSelectedTable,   // bàn đang xem QR
  qrDataUrl,         // ảnh QR (data URL) hiển thị
  qrPaymentAmount,   // số tiền (chế độ payment)
  qrPaymentCode,     // nội dung chuyển khoản
  qrPaymentStatus,   // trạng thái thanh toán (đang chờ/đã xong)
  qrLink,            // link bàn (chế độ link)
  formatCurrency,
  copyQrLink,        // copy link vào clipboard
} = useTablesContext();
</script>
