<template>
  <el-dialog v-model="showDetailDialog" title="Chi tiết bàn" width="700px" @open="onDetailDialogOpen">
    <div v-if="selectedTable" class="table-detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="Số bàn"
          >B{{ selectedTable.table_number }}</el-descriptions-item
        >
        <el-descriptions-item label="Số ghế"
          >{{ selectedTable.capacity }} chỗ</el-descriptions-item
        >
        <el-descriptions-item label="Trạng thái">
          <el-tag :type="getTagType(selectedTable.status)">{{
            getStatusText(selectedTable.status)
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Doanh thu">{{
          formatCurrency(selectedTable.totalRevenue)
        }}</el-descriptions-item>
        <el-descriptions-item label="QR">
          <div class="qr-token-row">
            <el-tag type="info" size="small">{{ selectedTable.qr_token || "—" }}</el-tag>
            <el-button
              v-if="selectedTable.qr_token"
              size="small"
              @click="openQrDialog(selectedTable)"
            >
              Xem QR
            </el-button>
            <el-button
              v-if="selectedTable.qr_token"
              size="small"
              type="primary"
              @click="openPaymentQrDialog(selectedTable)"
            >
              QR thanh toán
            </el-button>
          </div>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="selectedTable?.upcomingOrder && normalizeTableStatus(selectedTable?.status) === 'available'"
           class="orders-section upcoming-section">
        <div class="orders-section-header">
          <h4>⏰ Đặt trước sắp tới</h4>
          <el-tag type="warning" size="small">Chưa tới giờ</el-tag>
        </div>
        <div class="upcoming-detail">
          <p>
            <strong>Giờ đặt:</strong>
            {{ new Date(selectedTable.upcomingOrder.arrival_time).toLocaleString('vi-VN') }}
          </p>
          <p>
            <strong>Số khách:</strong>
            {{ selectedTable.upcomingOrder.number_of_guests }} người
          </p>
          <p class="upcoming-note">
            Bàn này có đặt trước, không nên xếp khách vãng lai vào trong khoảng thời gian trên.
          </p>
        </div>
        <div v-if="preOrders.length" style="margin-top:10px">
          <p style="font-size:13px;color:var(--hl-text-muted);margin-bottom:6px">Món đặt trước:</p>
          <div v-for="order in preOrders" :key="order.order_id" class="order-block">
            <div class="order-meta">Đơn #{{ order.order_id }} · Đặt trước</div>
            <div v-for="oi in order.OrderItems || []" :key="oi.order_item_id" class="order-item-row">
              <span>{{ oi.MenuItem?.name }} x {{ oi.quantity }}</span>
              <el-tag type="info" size="small">Chưa chế biến</el-tag>
            </div>
          </div>
        </div>
      </div>

      <div class="orders-section">
        <div class="orders-section-header">
          <h4>Đơn hàng hiện tại</h4>
          <el-button type="primary" size="small" @click="openCreateOrderDialog">
            <el-icon><Plus /></el-icon>
            Tạo đơn
          </el-button>
        </div>
        <div v-loading="tableOrdersLoading" class="orders-list">
          <template v-if="tableOrders.length === 0 && !tableOrdersLoading">
            <p class="text-muted">Chưa có đơn nào trong phiên này.</p>
          </template>
          <template v-else>
            <div v-for="order in tableOrders" :key="order.order_id" class="order-block">
              <div class="order-meta">
                Đơn #{{ order.order_id }}
                <el-tag
                  v-if="isLegacyPreorderOrderStatus(order.status)"
                  type="info"
                  size="small"
                  style="margin-left: 6px"
                >
                  Đặt món trước
                </el-tag>
                <el-tag
                  v-else-if="normalizeOrderStatus(order.status) === 'in_progress'"
                  type="warning"
                  size="small"
                  style="margin-left: 6px"
                >
                  {{ getOrderStatusLabel(order.status) }}
                </el-tag>
              </div>
              <div
                v-for="oi in order.OrderItems || []"
                :key="oi.order_item_id"
                class="order-item-row"
              >
                <span>{{ oi.MenuItem?.name }} x {{ oi.quantity }}</span>
                <div class="order-item-actions">
                  <el-tag v-if="oi.status === 'served'" type="success" size="small">Đã phục vụ</el-tag>
                  <template v-else>
                    <el-tag
                      v-if="oi.status === 'done'"
                      type="warning"
                      size="small"
                    >
                      Bếp đã xong
                    </el-tag>
                    <el-button
                      type="primary"
                      size="small"
                      link
                      @click="markItemServed(oi.order_item_id)"
                    >
                      Đánh dấu đã phục vụ
                    </el-button>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="orders-section" v-if="tableBill">
        <div class="orders-section-header">
          <h4>Hóa đơn tạm tính</h4>
        </div>
        <div v-loading="tableBillLoading" class="orders-list">
          <template v-if="!tableBill?.items?.length && !tableBillLoading">
            <p class="text-muted">Chưa có món nào để tính tiền.</p>
          </template>
          <template v-else>
            <BillSummary
              :items="tableBill.items"
              :subtotal-before-discount="tableBill.subtotal_before_discount"
              :discount-total="tableBill.discount_total"
              :total-amount="tableBill.total_amount"
              total-label="Tổng cộng"
            />
          </template>
        </div>
      </div>

      <div class="orders-section" v-if="tableBill">
        <div class="orders-section-header">
          <h4>Thanh toán &amp; hóa đơn</h4>
        </div>
        <div class="orders-list">
          <div class="payment-status" v-if="paymentInfo">
            <el-tag
              :type="paymentInfo.status === 'succeeded' ? 'success' : 'warning'"
              size="small"
            >
              {{ paymentInfo.status === 'succeeded' ? 'Đã thanh toán' : 'Chờ thanh toán' }}
            </el-tag>
            <span class="muted" v-if="paymentInfo.invoice_no">
              Mã HĐ: {{ paymentInfo.invoice_no }}
            </span>
            <span class="muted" v-if="paymentInfo.paid_at">
              • {{ formatDateTime(paymentInfo.paid_at) }}
            </span>
          </div>

          <el-form label-position="top" class="payment-form">
            <el-form-item label="Phương thức thanh toán">
              <el-select v-model="paymentMethod" placeholder="Chọn phương thức">
                <el-option
                  v-for="opt in paymentMethodOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Mã giao dịch (nếu có)">
              <el-input
                v-model="paymentTransactionRef"
                placeholder="Ví dụ: ngân hàng / ví / POS"
              />
            </el-form-item>
          </el-form>

          <div class="payment-actions">
            <el-button
              type="primary"
              :loading="paymentSubmitting"
              :disabled="!tableBill?.items?.length"
              @click="finalizePayment"
            >
              Xác nhận thanh toán
            </el-button>
            <el-button
              :disabled="!paymentInfo || paymentInfo.status !== 'succeeded'"
              @click="downloadInvoice"
            >
              Tải hóa đơn PDF
            </el-button>
            <el-button
              v-if="paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'SEPAY'"
              @click="openPaymentQrDialog(selectedTable)"
            >
              QR chuyển khoản
            </el-button>
          </div>
        </div>
      </div>

      <div class="actions">
        <el-button @click="showEditDialog">Sửa</el-button>
        <el-button v-if="userRole === 'admin'" type="danger" @click="deleteTable(selectedTable)">Xóa</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { Plus } from "@element-plus/icons-vue";
import BillSummary from "@/components/BillSummary.vue";
import { useTablesContext } from "../composables/tablesContext";

const {
  showDetailDialog,
  selectedTable,
  getTagType,
  getStatusText,
  formatCurrency,
  normalizeTableStatus,
  preOrders,
  tableOrders,
  tableOrdersLoading,
  isLegacyPreorderOrderStatus,
  normalizeOrderStatus,
  getOrderStatusLabel,
  markItemServed,
  openCreateOrderDialog,
  tableBill,
  tableBillLoading,
  paymentInfo,
  formatDateTime,
  paymentMethod,
  paymentMethodOptions,
  paymentTransactionRef,
  paymentSubmitting,
  finalizePayment,
  downloadInvoice,
  openPaymentQrDialog,
  openQrDialog,
  showEditDialog,
  deleteTable,
  userRole,
  onDetailDialogOpen,
} = useTablesContext();
</script>
