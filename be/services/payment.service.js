// be/services/payments.service.js
const { Payment, Order, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const ALLOWED_METHODS = ['COD', 'MOMO'];
const now = () => new Date();

// Tính tổng tiền từ order_items * menu_items.price
async function getOrderAmount(orderId) {
  const rows = await sequelize.query(
    `SELECT COALESCE(SUM(oi.quantity * COALESCE(mi.price,0)), 0) AS amount
     FROM order_items oi
     JOIN menu_items mi ON mi.item_id = oi.item_id
     WHERE oi.order_id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.amount || 0);
}


async function createSession({ orderId, method, returnUrl, cancelUrl }) {
  if (!ALLOWED_METHODS.includes(method)) throw new Error('UNSUPPORTED_METHOD');

  const order = await Order.findByPk(orderId);
  if (!order) throw new Error('ORDER_NOT_FOUND');

  // lấy amount từ items
  const amount = await getOrderAmount(orderId);
  if (amount <= 0) throw new Error('INVALID_AMOUNT');

  let payment = await Payment.findOne({ where: { order_id: orderId } });

  if (!payment) {
    // tạo mới
    payment = await Payment.create({
      order_id: orderId,
      amount,
      method,
      status: method === 'COD' ? 'pending' : 'requires_action',
      transaction_ref: null,
      paid_at: null,
      created_at: now()
    });
  } else {
    // nếu đã trả rồi thì không cho thanh toán lại
    if (payment.status === 'succeeded') throw new Error('ORDER_ALREADY_PAID');

    // user đổi phương thức
    payment.amount = amount;
    payment.method = method;
    payment.status = method === 'COD' ? 'pending' : 'requires_action';
    payment.transaction_ref = null;
    if (method !== 'COD') payment.paid_at = null;
    await payment.save();
  }

  if (method === 'COD') {
    return { nextAction: 'none', paymentId: payment.payment_id };
  }

  if (method === 'MOMO') {
    return {
      nextAction: 'redirect',
      redirectUrl: `/sandbox/momo/pay?orderId=${orderId}`,
      paymentId: payment.payment_id
    };
  }

  throw new Error('UNSUPPORTED_METHOD');
}

async function handleMomoWebhook(payload, verifyOk = true) {
  if (!verifyOk) throw new Error('INVALID_SIGNATURE');

  const orderId = Number(payload.extraData);
  const payment = await Payment.findOne({ where: { order_id: orderId } });
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');

  const ok = Number(payload.resultCode) === 0;
  const newStatus = ok ? 'succeeded' : 'failed';

  if (payment.status !== newStatus) {
    payment.status = newStatus;
    if (ok) {
      payment.transaction_ref = payload.orderId || payload.requestId || null;
      payment.paid_at = now();
    }
    await payment.save();
  }
  return true;
}

async function getPaymentByOrder(orderId) {
  return Payment.findOne({ where: { order_id: orderId } });
}

module.exports = {
  createSession,
  handleMomoWebhook,
  getPaymentByOrder,
};
