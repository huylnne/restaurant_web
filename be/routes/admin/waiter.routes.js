/**
 * ROUTES WAITER — API phục vụ: gọi món tại bàn, served, bill, checkout, invoice PDF.
 * Ctrl+F: waiter routes, /orders, /served, /checkout, invoice.pdf
 * Luồng demo: Phần 3 phục vụ gọi món/served, Phần 4 xác nhận thanh toán.
 */
const express = require('express');
const router = express.Router();
const waiterController = require('../../controllers/admin/waiter.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

router.use(verifyToken, authorizeRole('admin', 'waiter', 'manager'));

router.get('/branch-waiters', waiterController.listBranchWaiters);

router.patch(
  '/orders/:orderId/assign-waiter',
  auditLog({
    action: 'WAITER_ASSIGN',
    module: 'orders',
    description: (req) => `Gán phục vụ cho phiên #${req.params.orderId}`,
    entityType: 'order',
  }),
  waiterController.assignWaiter
);

// [GỌI MÓN] Phục vụ tạo/thêm món cho một bàn.
router.post(
  '/orders',
  auditLog({
    action: 'WAITER_ORDER_CREATE',
    module: 'orders',
    description: 'Phục vụ: tạo đơn tại bàn',
    entityType: 'order',
  }),
  waiterController.createOrder
);

// [SƠ ĐỒ BÀN] Lấy order/món hiện tại của bàn để mở dialog.
router.get('/orders', waiterController.listOrdersByTable);

// [PHỤC VỤ] Đánh dấu món đã bưng ra cho khách.
router.patch(
  '/order-items/:id/served',
  auditLog({
    action: 'WAITER_ITEM_SERVED',
    module: 'orders',
    description: (req) => `Đánh dấu đã phục vụ món #${req.params.id}`,
    entityType: 'order_item',
  }),
  waiterController.serveOrderItem
);

// [QUẢN LÝ BÀN] Đổi trạng thái bàn, ví dụ cleaning/available.
router.patch(
  '/tables/:id/assign-waiter',
  auditLog({
    action: 'WAITER_TABLE_ASSIGN',
    module: 'tables',
    description: (req) => `Gán phục vụ cho bàn #${req.params.id}`,
    entityType: 'table',
  }),
  waiterController.assignWaiterToTable
);

router.patch(
  '/tables/:id/status',
  auditLog({
    action: 'WAITER_TABLE_STATUS',
    module: 'tables',
    description: (req) => `Đổi trạng thái bàn #${req.params.id}`,
    entityType: 'table',
  }),
  waiterController.updateTableStatus
);

// [THANH TOÁN] Xem bill tạm tính trước khi thu tiền.
router.get('/tables/:id/bill', waiterController.getTableBill);

// [THANH TOÁN] Kiểm tra trạng thái payment của phiên bàn.
router.get('/tables/:id/payment', waiterController.getTablePayment);

// [THANH TOÁN] Xác nhận tiền mặt/chuyển khoản/thẻ và đóng phiên bàn.
router.post(
  '/tables/:id/checkout',
  auditLog({
    action: 'WAITER_PAYMENT_CHECKOUT',
    module: 'payments',
    description: (req) => `Xác nhận thanh toán bàn #${req.params.id}`,
    entityType: 'payment',
  }),
  waiterController.finalizePayment
);

// [HÓA ĐƠN] Xuất PDF hóa đơn sau khi payment succeeded.
router.get('/reservations/:id/invoice.pdf', waiterController.getInvoicePdf);

module.exports = router;