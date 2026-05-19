const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/user/payments.controller');
const { auditLog } = require('../../middlewares/operationLog');

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

router.get('/return', ctrl.paymentReturn);
router.get('/by-order/:id', ctrl.getPaymentByOrder);
router.get('/by-reservation/:id', ctrl.getPaymentByReservation);

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
