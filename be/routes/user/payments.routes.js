/**
 * ROUTES PAYMENT — API tạo phiên thanh toán, webhook MoMo/SePay, VietQR, tra cứu payment.
 * Ctrl+F: payment routes, /session, /webhook/momo, /webhook/sepay, /vietqr
 * Luồng demo: Phần 4 — thanh toán tiền mặt nhanh, online dùng khi cần mở rộng.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/user/payments.controller');
const { auditLog } = require('../../middlewares/operationLog');

// [THANH TOÁN] Tạo payment session cho order/reservation/tableToken.
router.post(
  '/session',
  auditLog({
    action: 'PAYMENT_SESSION_CREATE',
    module: 'payments',
    description: 'Tạo phiên thanh toán',
    entityType: 'payment',
    metadata: (req) => ({
      method: req.body?.method,
      reservationId: req.body?.reservationId,
      orderId: req.body?.orderId,
    }),
  }),
  ctrl.createSession
);

// [MOMO] Webhook IPN từ MoMo, verify chữ ký trong controller/service.
router.post(
  '/webhook/momo',
  express.json({ type: '*/*' }),
  auditLog({
    action: 'PAYMENT_MOMO_WEBHOOK',
    module: 'payments',
    description: 'MoMo IPN callback',
    metadata: (req) => ({
      orderId: req.body?.orderId,
      resultCode: req.body?.resultCode,
    }),
    successStatuses: [200, 201, 204],
  }),
  ctrl.momoWebhook
);

// [SEPAY] Webhook chuyển khoản ngân hàng, khớp nội dung DH{orderId}.
router.post(
  '/webhook/sepay',
  auditLog({
    action: 'PAYMENT_SEPAY_WEBHOOK',
    module: 'payments',
    description: 'SEPay bank transfer webhook',
    metadata: (req) => ({
      id: req.body?.id,
      code: req.body?.code,
      transferAmount: req.body?.transferAmount,
    }),
    successStatuses: [200, 201, 204],
  }),
  ctrl.sepayWebhook
);

// [THANH TOÁN ONLINE] Trang return sau redirect payment gateway.
router.get('/return', ctrl.paymentReturn);
// [TRA CỨU] Payment theo order_id.
router.get('/by-order/:id', ctrl.getPaymentByOrder);
// [TRA CỨU] Alias payment theo reservation_id.
router.get('/by-reservation/:id', ctrl.getPaymentByReservation);

// [VIETQR] Sinh mã QR chuyển khoản cho phiên bàn/order.
router.post(
  '/vietqr',
  auditLog({
    action: 'PAYMENT_VIETQR_CREATE',
    module: 'payments',
    description: 'Tạo mã VietQR thanh toán',
    entityType: 'payment',
    metadata: (req) => ({
      reservationId: req.body?.reservationId,
      tableToken: req.body?.tableToken ? '[present]' : null,
    }),
  }),
  ctrl.createVietQr
);

module.exports = router;
