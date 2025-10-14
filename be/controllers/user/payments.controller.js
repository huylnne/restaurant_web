// be/controllers/payments.controller.js
const service = require('../../services/payment.service');

// POST /api/payments/session
exports.createSession = async (req, res) => {
  try {
    const { orderId, method, returnUrl, cancelUrl } = req.body;
    const data = await service.createSession({ orderId, method, returnUrl, cancelUrl });
    res.json(data);
  } catch (e) {
    const map = { ORDER_NOT_FOUND:404, INVALID_AMOUNT:400, UNSUPPORTED_METHOD:400 };
    res.status(map[e.message] || 500).json({ error: e.message });
  }
};

// POST /api/payments/webhook/momo
exports.momoWebhook = async (req, res) => {
  try {
    // TODO: verify chữ ký theo tài liệu MoMo -> đặt verifyOk=true/false
    const verifyOk = true; // thay bằng hàm verify thật
    await service.handleMomoWebhook(req.body, verifyOk);
    res.send('ok');
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
