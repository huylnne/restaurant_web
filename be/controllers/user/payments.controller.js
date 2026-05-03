// be/controllers/payments.controller.js
const service = require('../../services/payment.service');

// POST /api/payments/session
exports.createSession = async (req, res) => {
  try {
    const { reservationId, tableToken, orderId, method, returnUrl, cancelUrl } = req.body;
    const data = await service.createSession({ reservationId, tableToken, orderId, method, returnUrl, cancelUrl });
    res.json(data);
  } catch (e) {
    const map = {
      ORDER_NOT_FOUND: 404,
      RESERVATION_NOT_FOUND: 404,
      TABLE_NOT_FOUND: 404,
      NO_ACTIVE_SESSION: 400,
      INVALID_AMOUNT: 400,
      UNSUPPORTED_METHOD: 400,
      MOMO_NOT_CONFIGURED: 500,
      RESERVATION_ALREADY_PAID: 409,
      ORDER_ALREADY_PAID: 409,
      INVALID_REQUEST: 400,
      ORDER_PAYMENT_MOMO_NOT_SUPPORTED: 400,
    };
    res.status(map[e.message] || 500).json({ error: e.message });
  }
};

// POST /api/payments/webhook/momo
exports.momoWebhook = async (req, res) => {
  try {
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const { verifyIpnSignature } = require("../../utils/momo");

    const verifyOk = verifyIpnSignature(req.body, { accessKey, secretKey });
    await service.handleMomoWebhook(req.body, verifyOk);
    // MoMo khuyến nghị trả 204
    res.status(204).send();
  } catch (e) {
    res.status(400).send(e.message);
  }
};

// GET /api/payments/return?orderId=...
exports.paymentReturn = async (req, res) => {
  const { orderId } = req.query;
  const payment = await service.getPaymentByOrder(orderId);
  if (!payment) return res.status(404).send('Not found');
  return res.redirect(`/checkout/result?status=${payment.status}&orderId=${orderId}`);
};

// GET /api/orders/:id/payment  (tiện frontend hỏi trạng thái)
exports.getPaymentByOrder = async (req, res) => {
  const p = await service.getPaymentByOrder(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
};

// GET /api/payments/by-reservation/:id
exports.getPaymentByReservation = async (req, res) => {
  const p = await service.getPaymentByReservation(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
};

// POST /api/payments/vietqr  (bank scan -> auto amount)
exports.createVietQr = async (req, res) => {
  try {
    const { reservationId, tableToken } = req.body || {};
    const data = await service.createVietQr({ reservationId, tableToken });
    res.json(data);
  } catch (e) {
    const map = {
      RESERVATION_NOT_FOUND: 404,
      TABLE_NOT_FOUND: 404,
      NO_ACTIVE_SESSION: 400,
      INVALID_AMOUNT: 400,
      VIETQR_NOT_CONFIGURED: 500,
    };
    res.status(map[e.message] || 500).json({ error: e.message });
  }
};
