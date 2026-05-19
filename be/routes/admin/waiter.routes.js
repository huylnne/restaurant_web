const express = require('express');
const router = express.Router();
const waiterController = require('../../controllers/admin/waiter.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

router.use(verifyToken, authorizeRole('admin', 'waiter'));

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

router.get('/orders', waiterController.listOrdersByTable);

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

router.get('/tables/:id/bill', waiterController.getTableBill);

router.get('/tables/:id/payment', waiterController.getTablePayment);

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

router.get('/reservations/:id/invoice.pdf', waiterController.getInvoicePdf);

module.exports = router;