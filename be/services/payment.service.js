const axios = require("axios");
const { Payment, Order, Reservation, Table, sequelize } = require("../models");
const { QueryTypes, Op } = require("sequelize");
const billService = require("./bill.service");
const momo = require("../utils/momo");
const { generateVietQR } = require("vietqr-ts");
const { TABLE_STATUS } = require("../utils/tableStatus");

const PAYMENT_METHODS = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  CARD: "CARD",
  WALLET: "WALLET",
  MOMO: "MOMO",
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

const ACTIVE_RESERVATION_STATUSES = ["confirmed", "pre-ordered", "waiting_payment"];

// Legacy: tính tổng theo 1 order
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

async function getActiveReservationByTableId(tableId) {
  return Reservation.findOne({
    where: {
      table_id: tableId,
      status: { [Op.in]: ACTIVE_RESERVATION_STATUSES },
    },
    order: [["created_at", "DESC"]],
  });
}

async function getAmountByReservation(reservationId) {
  const reservation = await Reservation.findByPk(reservationId, { attributes: ["reservation_id", "table_id"] });
  if (!reservation) throw new Error("RESERVATION_NOT_FOUND");
  if (!reservation.table_id) throw new Error("TABLE_NOT_FOUND");
  const bill = await billService.getBillByTable(reservation.table_id);
  const amount = Number(bill?.total_amount || 0);
  return { amount, reservation, bill };
}

async function createOrUpdatePaymentForReservation({ reservationId, amount, method }) {
  const normalizedMethod = normalizeMethod(method);
  let payment = await Payment.findOne({ where: { reservation_id: reservationId } });
  if (!payment) {
    payment = await Payment.create({
      reservation_id: reservationId,
      order_id: null,
      amount,
      method: normalizedMethod,
      status: isOfflineMethod(normalizedMethod) ? "pending" : "requires_action",
      transaction_ref: null,
      paid_at: null,
      created_at: now(),
    });
  } else {
    if (payment.status === "succeeded") throw new Error("RESERVATION_ALREADY_PAID");
    payment.amount = amount;
    payment.method = normalizedMethod;
    payment.status = isOfflineMethod(normalizedMethod) ? "pending" : "requires_action";
    payment.transaction_ref = null;
    if (!isOfflineMethod(normalizedMethod)) payment.paid_at = null;
    await payment.save();
  }
  return payment;
}

async function createMomoSessionForReservation({ reservationId, amount, returnUrl, cancelUrl }) {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const endpoint = process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create";
  const ipnUrl = process.env.MOMO_IPN_URL;
  const redirectUrl = returnUrl || process.env.MOMO_REDIRECT_URL;

  if (!partnerCode || !accessKey || !secretKey || !ipnUrl || !redirectUrl) {
    throw new Error("MOMO_NOT_CONFIGURED");
  }

  // MoMo yêu cầu amount dạng Long (VND)
  const momoAmount = Math.round(Number(amount));
  if (!Number.isFinite(momoAmount) || momoAmount <= 0) throw new Error("INVALID_AMOUNT");

  const requestId = `${partnerCode}_${Date.now()}`;
  const orderId = requestId;
  const orderInfo = `Thanh toan ban (reservation ${reservationId})`;
  const requestType = "captureWallet";
  const extraData = momo.encodeExtraData({ reservationId });

  const rawSignature = momo.buildCreateRawSignature({
    accessKey,
    amount: String(momoAmount),
    extraData,
    ipnUrl,
    orderId,
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
    orderId,
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

/**
 * Tạo session thanh toán
 * - Ưu tiên reservationId (phiên bàn)
 * - Hoặc tableToken (QR bàn) -> resolve bàn -> lấy reservation active
 * - Legacy: orderId (giữ tương thích)
 */
async function createSession({ reservationId, tableToken, orderId, method, returnUrl, cancelUrl }) {
  const normalizedMethod = normalizeMethod(method);
  if (!ALLOWED_METHODS.includes(normalizedMethod)) throw new Error("UNSUPPORTED_METHOD");

  // 1) Phiên bàn (recommended)
  if (reservationId || tableToken) {
    let resId = reservationId ? Number(reservationId) : null;

    if (!resId && tableToken) {
      const table = await Table.findOne({ where: { qr_token: tableToken }, attributes: ["table_id"] });
      if (!table) throw new Error("TABLE_NOT_FOUND");
      const active = await getActiveReservationByTableId(table.table_id);
      if (!active) throw new Error("NO_ACTIVE_SESSION");
      resId = active.reservation_id;
    }

    const { amount } = await getAmountByReservation(resId);
    if (amount <= 0) throw new Error("INVALID_AMOUNT");

    const payment = await createOrUpdatePaymentForReservation({
      reservationId: resId,
      amount,
      method: normalizedMethod,
    });

    if (isOfflineMethod(normalizedMethod)) {
      return { nextAction: "none", paymentId: payment.payment_id, reservationId: resId };
    }

    if (normalizedMethod === PAYMENT_METHODS.MOMO) {
      const momoData = await createMomoSessionForReservation({ reservationId: resId, amount, returnUrl, cancelUrl });
      // Lưu mapping giao dịch: dùng orderId/requestId của MoMo để trace
      payment.transaction_ref = momoData.orderId || momoData.requestId || payment.transaction_ref;
      await payment.save();
      return {
        nextAction: "redirect",
        payUrl: momoData.payUrl,
        qrCodeUrl: momoData.qrCodeUrl,
        deeplink: momoData.deeplink,
        paymentId: payment.payment_id,
        reservationId: resId,
      };
    }
  }

  // 2) Legacy order flow
  if (orderId) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const amount = await getOrderAmount(orderId);
    if (amount <= 0) throw new Error("INVALID_AMOUNT");

    let payment = await Payment.findOne({ where: { order_id: orderId } });
    if (!payment) {
      payment = await Payment.create({
        order_id: orderId,
        reservation_id: order.reservation_id || null,
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

    if (isOfflineMethod(normalizedMethod)) {
      return { nextAction: "none", paymentId: payment.payment_id, orderId };
    }

    if (normalizedMethod === PAYMENT_METHODS.MOMO) {
      // Legacy: treat orderId as reservationId is not supported; ask migrate
      throw new Error("ORDER_PAYMENT_MOMO_NOT_SUPPORTED");
    }
  }

  throw new Error("INVALID_REQUEST");
}

async function onPaymentSucceededByReservation(reservationId) {
  const reservation = await Reservation.findByPk(reservationId);
  if (!reservation) return;

  // Hoàn tất mọi orders thuộc phiên hiện tại (reservation + table)
  await Order.update(
    { status: "COMPLETED" },
    {
      where: {
        [Op.or]: [{ reservation_id: reservationId }, { table_id: reservation.table_id }],
        status: { [Op.notIn]: ["COMPLETED", "CANCELLED"] },
      },
    }
  );

  await Reservation.update({ status: "completed" }, { where: { reservation_id: reservationId } });
  if (reservation.table_id) {
    await Table.update(
      { status: TABLE_STATUS.CLEANING },
      { where: { table_id: reservation.table_id } }
    );
  }
}

async function finalizeReservationPayment({ reservationId, tableId, method, transactionRef }) {
  const normalizedMethod = normalizeMethod(method);
  if (!ALLOWED_METHODS.includes(normalizedMethod)) throw new Error("UNSUPPORTED_METHOD");

  let resId = reservationId ? Number(reservationId) : null;
  if (!resId && tableId) {
    const active = await getActiveReservationByTableId(tableId);
    if (!active) throw new Error("NO_ACTIVE_SESSION");
    resId = active.reservation_id;
  }
  if (!resId) throw new Error("RESERVATION_NOT_FOUND");

  const { amount } = await getAmountByReservation(resId);
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  const payment = await createOrUpdatePaymentForReservation({
    reservationId: resId,
    amount,
    method: normalizedMethod,
  });

  payment.status = "succeeded";
  payment.paid_at = now();
  if (transactionRef) payment.transaction_ref = transactionRef;
  if (!payment.invoice_no) payment.invoice_no = generateInvoiceNo(payment.payment_id);
  if (!payment.invoice_issued_at) payment.invoice_issued_at = now();
  await payment.save();

  await onPaymentSucceededByReservation(resId);

  return payment;
}

async function handleMomoWebhook(payload, verifyOk = true) {
  if (!verifyOk) throw new Error("INVALID_SIGNATURE");

  const extra = momo.decodeExtraData(payload.extraData);
  const reservationId = Number(extra.reservationId);
  if (!reservationId) throw new Error("RESERVATION_NOT_FOUND");

  const payment = await Payment.findOne({ where: { reservation_id: reservationId } });
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
      await onPaymentSucceededByReservation(reservationId);
    } else {
      await payment.save();
    }
  }
  return true;
}

async function getPaymentByOrder(orderId) {
  return Payment.findOne({ where: { order_id: orderId } });
}

async function getPaymentByReservation(reservationId) {
  return Payment.findOne({ where: { reservation_id: reservationId } });
}

module.exports = {
  createSession,
  handleMomoWebhook,
  getPaymentByOrder,
  getPaymentByReservation,
  onPaymentSucceededByReservation,
  getActiveReservationByTableId,
  finalizeReservationPayment,
  PAYMENT_METHODS,
  async createVietQr({ reservationId, tableToken }) {
    let resId = reservationId ? Number(reservationId) : null;
    if (!resId && tableToken) {
      const table = await Table.findOne({ where: { qr_token: tableToken }, attributes: ["table_id"] });
      if (!table) throw new Error("TABLE_NOT_FOUND");
      const active = await getActiveReservationByTableId(table.table_id);
      if (!active) throw new Error("NO_ACTIVE_SESSION");
      resId = active.reservation_id;
    }
    if (!resId) throw new Error("RESERVATION_NOT_FOUND");

    const bankBin = process.env.VIETQR_BANK_BIN;
    const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
    const serviceCode = process.env.VIETQR_SERVICE_CODE || "QRIBFTTA";
    if (!bankBin || !accountNumber) throw new Error("VIETQR_NOT_CONFIGURED");

    const { amount } = await getAmountByReservation(resId);
    const vnd = Math.round(Number(amount));
    if (!Number.isFinite(vnd) || vnd <= 0) throw new Error("INVALID_AMOUNT");

    const qr = generateVietQR({
      bankBin: String(bankBin),
      accountNumber: String(accountNumber),
      serviceCode,
      amount: String(vnd),
      message: `Thanh toan ban ${resId}`,
      billNumber: `RSV-${resId}`,
    });

    return {
      reservationId: resId,
      amount: vnd,
      vietqrRaw: qr.rawData,
      qrType: qr.qrType,
    };
  },
};
