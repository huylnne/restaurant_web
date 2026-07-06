/**
 * CONTROLLER PAYMENT — HTTP layer cho payment session, webhook MoMo/SePay, VietQR, tra cứu payment.
 * Ctrl+F: payment controller, createSession, momoWebhook, sepayWebhook, createVietQr
 * Luồng demo: Phần 4 — thanh toán; tiền mặt đi qua waiter.finalizePayment, online đi qua controller này.
 */
const service = require('../../services/payment.service');

/** [THANH TOÁN] POST /api/payments/session — tạo phiên thanh toán cho order/reservation/tableToken. Ctrl+F: createSession payment */
exports.createSession = async (req, res) => {
  try {
    const { orderId, reservationId, tableToken, method, returnUrl, cancelUrl } = req.body;
    const data = await service.createSession({ orderId, reservationId, tableToken, method, returnUrl, cancelUrl });
    res.json(data);
  } catch (e) {
    const map = {
      ORDER_NOT_FOUND: 404,
      TABLE_NOT_FOUND: 404,
      NO_ACTIVE_SESSION: 400,
      INVALID_AMOUNT: 400,
      UNSUPPORTED_METHOD: 400,
      MOMO_NOT_CONFIGURED: 500,
      ORDER_ALREADY_PAID: 409,
      INVALID_REQUEST: 400,
    };
    res.status(map[e.message] || 500).json({ error: e.message });
  }
};

/** [MOMO] POST /api/payments/webhook/momo — verify chữ ký và đóng phiên nếu MoMo success. Ctrl+F: momoWebhook */
exports.momoWebhook = async (req, res) => {
  try {
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const { verifyIpnSignature } = require("../../utils/momo");

    const verifyOk = verifyIpnSignature(req.body, { accessKey, secretKey });
    await service.handleMomoWebhook(req.body, verifyOk);
    res.status(204).send();
  } catch (e) {
    res.status(400).send(e.message);
  }
};

/** [SEPAY] POST /api/payments/webhook/sepay — nhận chuyển khoản và khớp mã DH{orderId}. Ctrl+F: sepayWebhook */
exports.sepayWebhook = async (req, res) => {
  try {
    const configuredKey = process.env.SEPAY_WEBHOOK_API_KEY;
    const authHeader = req.get("authorization") || "";
    const receivedKey = authHeader.replace(/^(Bearer|Apikey|ApiKey|Token)\s+/i, "").trim();
    const xApiKey = req.get("x-api-key") || "";
    const verifyOk =
      !configuredKey ||
      receivedKey === configuredKey ||
      authHeader === configuredKey ||
      xApiKey === configuredKey;

    const result = await service.handleSePayWebhook(req.body, verifyOk);
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    if (e.message === "INVALID_SIGNATURE") {
      return res.status(401).json({ success: false, error: e.message });
    }
    res.status(200).json({ success: true, processed: false, error: e.message });
  }
};

/** [THANH TOÁN ONLINE] Redirect khách về kết quả checkout sau gateway. Ctrl+F: paymentReturn */
exports.paymentReturn = async (req, res) => {
  const { orderId } = req.query;
  const payment = await service.getPaymentByOrder(orderId);
  if (!payment) return res.status(404).send('Not found');
  return res.redirect(`/checkout/result?status=${payment.status}&orderId=${orderId}`);
};

/** [TRA CỨU] Lấy payment theo order_id để FE polling trạng thái. Ctrl+F: getPaymentByOrder */
exports.getPaymentByOrder = async (req, res) => {
  const p = await service.getPaymentByOrder(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
};

// [TRA CỨU] Alias route cũ /by-order/:id.
exports.getPaymentByOrderAlias = exports.getPaymentByOrder;

/** [TRA CỨU] Lấy payment theo reservation_id (alias order_id). Ctrl+F: getPaymentByReservation */
exports.getPaymentByReservation = async (req, res) => {
  const p = await service.getPaymentByReservation(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
};

/** [VIETQR] Sinh payload VietQR đúng số tiền để khách chuyển khoản. Ctrl+F: createVietQr */
exports.createVietQr = async (req, res) => {
  try {
    const { orderId, tableToken } = req.body || {};
    const data = await service.createVietQr({ orderId, tableToken });
    res.json(data);
  } catch (e) {
    const map = {
      ORDER_NOT_FOUND: 404,
      TABLE_NOT_FOUND: 404,
      NO_ACTIVE_SESSION: 400,
      INVALID_AMOUNT: 400,
      VIETQR_NOT_CONFIGURED: 500,
      ORDER_ALREADY_PAID: 409,
    };
    res.status(map[e.message] || 500).json({ error: e.message });
  }
};
