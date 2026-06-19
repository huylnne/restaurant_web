const axios = require("axios");
const { Payment, Order, Table, sequelize } = require("../models");
const { QueryTypes, Op } = require("sequelize");
const billService = require("./bill.service");
const momo = require("../utils/momo");
const { generateVietQR } = require("vietqr-ts");
const { TABLE_STATUS } = require("../utils/tableStatus");
const { ORDER_STATUS, activeOrderStatusWhere } = require("../utils/orderStatus");

const PAYMENT_METHODS = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  CARD: "CARD",
  WALLET: "WALLET",
  MOMO: "MOMO",
  SEPAY: "SEPAY",
  COD: "COD",
};

const ALLOWED_METHODS = Object.values(PAYMENT_METHODS);
const OFFLINE_METHODS = new Set([
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.BANK_TRANSFER,
  PAYMENT_METHODS.CARD,
  PAYMENT_METHODS.WALLET,
  PAYMENT_METHODS.COD,
]);
const now = () => new Date();

async function getOrderAmount(orderId) {
  const rows = await sequelize.query(
    `SELECT COALESCE(SUM(oi.quantity * COALESCE(oi.price, mi.price, 0)), 0) AS amount
     FROM order_items oi
     JOIN menu_items mi ON mi.item_id = oi.item_id
     WHERE oi.order_id = :orderId`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.amount || 0);
}

function normalizeMethod(method) {
  if (!method) return method;
  if (method === PAYMENT_METHODS.COD) return PAYMENT_METHODS.CASH;
  return method;
}

function isOfflineMethod(method) {
  return OFFLINE_METHODS.has(method);
}

function generateInvoiceNo(paymentId) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `INV-${stamp}-${paymentId}`;
}

function getSePayOrderPrefix() {
  return String(process.env.SEPAY_ORDER_PREFIX || "DH")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
}

function buildSePayOrderCode(orderId) {
  return `${getSePayOrderPrefix()}${Number(orderId)}`;
}

function extractSePayOrderId(payload = {}) {
  const prefix = getSePayOrderPrefix();
  const candidates = [
    payload.code,
    payload.subAccount,
    payload.content,
    payload.description,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  const patterns = [
    new RegExp(`${prefix}\\s*[-_]?\\s*(\\d+)`, "i"),
    /\bORD\s*[-_]?\s*(\d+)\b/i,
    /\bThanh\s*toan\s*ban\s*(\d+)\b/i,
  ];

  for (const text of candidates) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return Number(match[1]);
    }
  }
  return null;
}

function sePayTransactionRef(payload = {}) {
  const id = payload.id || payload.referenceCode || payload.code;
  return id ? `SEPAY:${id}` : null;
}

function resolveSessionOrderId({ orderId, reservationId }) {
  if (orderId) return Number(orderId);
  if (reservationId) return Number(reservationId);
  return null;
}

async function getActiveOrderByTableId(tableId) {
  return billService.findActiveOrderByTable(tableId);
}

async function getAmountByOrder(sessionOrderId) {
  const order = await Order.findByPk(sessionOrderId, {
    attributes: ["order_id", "table_id"],
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!order.table_id) throw new Error("TABLE_NOT_FOUND");
  const bill = await billService.getBillByTable(order.table_id);
  const amount = Number(bill?.total_amount || 0);
  return { amount, order, bill };
}

async function createOrUpdatePaymentForOrder({ orderId, amount, method }) {
  const normalizedMethod = normalizeMethod(method);
  let payment = await Payment.findOne({ where: { order_id: orderId } });
  if (!payment) {
    payment = await Payment.create({
      order_id: orderId,
      amount,
      method: normalizedMethod,
      status: isOfflineMethod(normalizedMethod) ? "pending" : "requires_action",
      transaction_ref: null,
      paid_at: null,
      created_at: now(),
    });
  } else {
    if (payment.status === "succeeded") throw new Error("ORDER_ALREADY_PAID");
    payment.amount = amount;
    payment.method = normalizedMethod;
    payment.status = isOfflineMethod(normalizedMethod) ? "pending" : "requires_action";
    payment.transaction_ref = null;
    if (!isOfflineMethod(normalizedMethod)) payment.paid_at = null;
    await payment.save();
  }
  return payment;
}

async function createMomoSessionForOrder({ orderId, amount, returnUrl, cancelUrl }) {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const endpoint = process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create";
  const ipnUrl = process.env.MOMO_IPN_URL;
  const redirectUrl = returnUrl || process.env.MOMO_REDIRECT_URL;

  if (!partnerCode || !accessKey || !secretKey || !ipnUrl || !redirectUrl) {
    throw new Error("MOMO_NOT_CONFIGURED");
  }

  const momoAmount = Math.round(Number(amount));
  if (!Number.isFinite(momoAmount) || momoAmount <= 0) throw new Error("INVALID_AMOUNT");

  const requestId = `${partnerCode}_${Date.now()}`;
  const momoOrderId = requestId;
  const orderInfo = `Thanh toan ban (order ${orderId})`;
  const requestType = "captureWallet";
  const extraData = momo.encodeExtraData({ orderId, reservationId: orderId });

  const rawSignature = momo.buildCreateRawSignature({
    accessKey,
    amount: String(momoAmount),
    extraData,
    ipnUrl,
    orderId: momoOrderId,
    orderInfo,
    partnerCode,
    redirectUrl,
    requestId,
    requestType,
  });
  const signature = momo.hmacSha256(rawSignature, secretKey);

  const body = {
    partnerCode,
    accessKey,
    requestId,
    amount: momoAmount,
    orderId: momoOrderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    requestType,
    extraData,
    lang: "vi",
    signature,
  };

  const resp = await axios.post(endpoint, body, { headers: { "Content-Type": "application/json" } });
  return resp.data;
}

async function createSession({ orderId, reservationId, tableToken, method, returnUrl, cancelUrl }) {
  const normalizedMethod = normalizeMethod(method);
  if (!ALLOWED_METHODS.includes(normalizedMethod)) throw new Error("UNSUPPORTED_METHOD");

  let sessionOrderId = resolveSessionOrderId({ orderId, reservationId });

  if (!sessionOrderId && tableToken) {
    const table = await Table.findOne({ where: { qr_token: tableToken }, attributes: ["table_id"] });
    if (!table) throw new Error("TABLE_NOT_FOUND");
    const active = await getActiveOrderByTableId(table.table_id);
    if (!active) throw new Error("NO_ACTIVE_SESSION");
    sessionOrderId = active.order_id;
  }

  if (!sessionOrderId) throw new Error("INVALID_REQUEST");

  const { amount } = await getAmountByOrder(sessionOrderId);
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  const payment = await createOrUpdatePaymentForOrder({
    orderId: sessionOrderId,
    amount,
    method: normalizedMethod,
  });

  await Order.update({ payment_status: "pending" }, { where: { order_id: sessionOrderId } });

  if (isOfflineMethod(normalizedMethod)) {
    return { nextAction: "none", paymentId: payment.payment_id, orderId: sessionOrderId };
  }

  if (normalizedMethod === PAYMENT_METHODS.MOMO) {
    const momoData = await createMomoSessionForOrder({
      orderId: sessionOrderId,
      amount,
      returnUrl,
      cancelUrl,
    });
    payment.transaction_ref = momoData.orderId || momoData.requestId || payment.transaction_ref;
    await payment.save();
    return {
      nextAction: "redirect",
      payUrl: momoData.payUrl,
      qrCodeUrl: momoData.qrCodeUrl,
      deeplink: momoData.deeplink,
      paymentId: payment.payment_id,
      orderId: sessionOrderId,
    };
  }

  if (normalizedMethod === PAYMENT_METHODS.SEPAY) {
    const qr = await createVietQrForOrder(sessionOrderId);
    return {
      nextAction: "qr",
      paymentId: payment.payment_id,
      orderId: sessionOrderId,
      ...qr,
    };
  }

  throw new Error("UNSUPPORTED_METHOD");
}

async function onPaymentSucceededByOrder(sessionOrderId) {
  const order = await Order.findByPk(sessionOrderId);
  if (!order) return;

  await Order.update(
    {
      status: ORDER_STATUS.COMPLETED,
      payment_status: "succeeded",
    },
    { where: { order_id: sessionOrderId } }
  );

  if (order.table_id) {
    await Table.update(
      { status: TABLE_STATUS.CLEANING },
      { where: { table_id: order.table_id } }
    );
  }
}

async function finalizeReservationPayment({ reservationId, orderId, tableId, method, transactionRef }) {
  const normalizedMethod = normalizeMethod(method);
  if (!ALLOWED_METHODS.includes(normalizedMethod)) throw new Error("UNSUPPORTED_METHOD");

  let sessionOrderId = resolveSessionOrderId({ orderId, reservationId });
  if (!sessionOrderId && tableId) {
    const active = await getActiveOrderByTableId(tableId);
    if (!active) throw new Error("NO_ACTIVE_SESSION");
    sessionOrderId = active.order_id;
  }
  if (!sessionOrderId) throw new Error("ORDER_NOT_FOUND");

  const { amount } = await getAmountByOrder(sessionOrderId);
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  const payment = await createOrUpdatePaymentForOrder({
    orderId: sessionOrderId,
    amount,
    method: normalizedMethod,
  });

  payment.status = "succeeded";
  payment.paid_at = now();
  if (transactionRef) payment.transaction_ref = transactionRef;
  if (!payment.invoice_no) payment.invoice_no = generateInvoiceNo(payment.payment_id);
  if (!payment.invoice_issued_at) payment.invoice_issued_at = now();
  await payment.save();

  await onPaymentSucceededByOrder(sessionOrderId);

  return payment;
}

async function handleMomoWebhook(payload, verifyOk = true) {
  if (!verifyOk) throw new Error("INVALID_SIGNATURE");

  const extra = momo.decodeExtraData(payload.extraData);
  const sessionOrderId = Number(extra.orderId || extra.reservationId);
  if (!sessionOrderId) throw new Error("ORDER_NOT_FOUND");

  const payment = await Payment.findOne({ where: { order_id: sessionOrderId } });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");

  const ok = Number(payload.resultCode) === 0;
  const newStatus = ok ? "succeeded" : "failed";

  if (payment.status !== newStatus) {
    payment.status = newStatus;
    if (ok) {
      payment.transaction_ref = String(payload.transId || payload.orderId || payload.requestId || "");
      payment.paid_at = now();
      if (!payment.invoice_no) payment.invoice_no = generateInvoiceNo(payment.payment_id);
      if (!payment.invoice_issued_at) payment.invoice_issued_at = now();
      await payment.save();
      await onPaymentSucceededByOrder(sessionOrderId);
    } else {
      await payment.save();
      await Order.update({ payment_status: "failed" }, { where: { order_id: sessionOrderId } });
    }
  }
  return true;
}

async function handleSePayWebhook(payload, verifyOk = true) {
  if (!verifyOk) throw new Error("INVALID_SIGNATURE");
  if (String(payload.transferType || "").toLowerCase() !== "in") {
    return { processed: false, reason: "IGNORED_TRANSFER_TYPE" };
  }

  const expectedAccountNumber = process.env.SEPAY_ACCOUNT_NUMBER || process.env.VIETQR_ACCOUNT_NUMBER;
  if (expectedAccountNumber && String(payload.accountNumber) !== String(expectedAccountNumber)) {
    return { processed: false, reason: "IGNORED_ACCOUNT" };
  }

  const sessionOrderId = extractSePayOrderId(payload);
  if (!sessionOrderId) return { processed: false, reason: "ORDER_CODE_NOT_FOUND" };

  const transferAmount = Math.round(Number(payload.transferAmount || 0));
  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return { processed: false, reason: "INVALID_AMOUNT" };
  }

  const transactionRef = sePayTransactionRef(payload);
  if (transactionRef) {
    const existingTransaction = await Payment.findOne({ where: { transaction_ref: transactionRef } });
    if (existingTransaction?.status === "succeeded") {
      return { processed: true, paymentId: existingTransaction.payment_id, orderId: existingTransaction.order_id };
    }
  }

  const { amount } = await getAmountByOrder(sessionOrderId);
  const expectedAmount = Math.round(Number(amount));
  if (transferAmount !== expectedAmount) {
    return {
      processed: false,
      reason: "AMOUNT_MISMATCH",
      orderId: sessionOrderId,
      expectedAmount,
      transferAmount,
    };
  }

  let payment = await Payment.findOne({ where: { order_id: sessionOrderId } });
  if (payment?.status === "succeeded") {
    return { processed: true, paymentId: payment.payment_id, orderId: sessionOrderId, reason: "ALREADY_PAID" };
  }

  if (!payment) {
    payment = await Payment.create({
      order_id: sessionOrderId,
      amount: expectedAmount,
      method: PAYMENT_METHODS.SEPAY,
      status: "pending",
      transaction_ref: null,
      paid_at: null,
      created_at: now(),
    });
  }

  payment.amount = expectedAmount;
  payment.method = PAYMENT_METHODS.SEPAY;
  payment.status = "succeeded";
  payment.transaction_ref = transactionRef || payment.transaction_ref;
  payment.paid_at = now();
  if (!payment.invoice_no) payment.invoice_no = generateInvoiceNo(payment.payment_id);
  if (!payment.invoice_issued_at) payment.invoice_issued_at = now();
  await payment.save();

  await onPaymentSucceededByOrder(sessionOrderId);

  return { processed: true, paymentId: payment.payment_id, orderId: sessionOrderId };
}

async function getPaymentByOrder(orderId) {
  return Payment.findOne({ where: { order_id: orderId } });
}

async function getPaymentByReservation(reservationId) {
  return getPaymentByOrder(reservationId);
}

module.exports = {
  createSession,
  handleMomoWebhook,
  handleSePayWebhook,
  getPaymentByOrder,
  getPaymentByReservation,
  onPaymentSucceededByReservation: onPaymentSucceededByOrder,
  onPaymentSucceededByOrder,
  getActiveReservationByTableId: getActiveOrderByTableId,
  getActiveOrderByTableId,
  finalizeReservationPayment,
  PAYMENT_METHODS,
  async createVietQr({ orderId, reservationId, tableToken }) {
    let sessionOrderId = resolveSessionOrderId({ orderId, reservationId });

    if (!sessionOrderId && tableToken) {
      const table = await Table.findOne({ where: { qr_token: tableToken }, attributes: ["table_id"] });
      if (!table) throw new Error("TABLE_NOT_FOUND");
      const active = await getActiveOrderByTableId(table.table_id);
      if (!active) throw new Error("NO_ACTIVE_SESSION");
      sessionOrderId = active.order_id;
    }
    if (!sessionOrderId) throw new Error("ORDER_NOT_FOUND");

    const qrData = await createVietQrForOrder(sessionOrderId);

    return {
      orderId: sessionOrderId,
      reservationId: sessionOrderId,
      ...qrData,
    };
  },
};

async function createVietQrForOrder(sessionOrderId) {
  const bankBin = process.env.VIETQR_BANK_BIN;
  const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
  const serviceCode = process.env.VIETQR_SERVICE_CODE || "QRIBFTTA";
  if (!bankBin || !accountNumber) throw new Error("VIETQR_NOT_CONFIGURED");

  const { amount } = await getAmountByOrder(sessionOrderId);
  const vnd = Math.round(Number(amount));
  if (!Number.isFinite(vnd) || vnd <= 0) throw new Error("INVALID_AMOUNT");

  const payment = await createOrUpdatePaymentForOrder({
    orderId: sessionOrderId,
    amount: vnd,
    method: PAYMENT_METHODS.SEPAY,
  });
  await Order.update({ payment_status: "pending" }, { where: { order_id: sessionOrderId } });

  const paymentCode = buildSePayOrderCode(sessionOrderId);
  const qr = generateVietQR({
    bankBin: String(bankBin),
    accountNumber: String(accountNumber),
    serviceCode,
    amount: String(vnd),
    message: paymentCode,
    purpose: paymentCode,
    billNumber: paymentCode,
  });

  return {
    amount: vnd,
    paymentId: payment.payment_id,
    paymentCode,
    vietqrContent: paymentCode,
    vietqrRaw: qr.rawData,
    qrType: qr.qrType,
  };
}
