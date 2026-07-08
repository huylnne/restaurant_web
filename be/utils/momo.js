/**
 * UTIL MOMO — ký request và verify IPN/webhook từ cổng thanh toán MoMo.
 * Ctrl+F: momo util, hmacSha256, verifyIpnSignature, extraData
 * Dùng bởi: payment.service.js khi tạo phiên MoMo và nhận webhook.
 */
const crypto = require("crypto");

/** [MOMO] Tạo chữ ký HMAC SHA256 theo secretKey MoMo. Ctrl+F: hmacSha256 */
function hmacSha256(rawSignature, secretKey) {
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

/** [MOMO] Chuỗi raw signature đúng thứ tự field khi gọi API tạo payment. Ctrl+F: buildCreateRawSignature */
function buildCreateRawSignature({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
}) {
  return (
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType
  );
}

/** [MOMO] Chuỗi raw signature để verify IPN/webhook trả về. Ctrl+F: buildIpnRawSignature */
function buildIpnRawSignature({
  accessKey,
  amount,
  extraData,
  message,
  orderId,
  orderInfo,
  orderType,
  partnerCode,
  payType,
  requestId,
  responseTime,
  resultCode,
  transId,
}) {
  return (
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&message=" +
    message +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&orderType=" +
    orderType +
    "&partnerCode=" +
    partnerCode +
    "&payType=" +
    payType +
    "&requestId=" +
    requestId +
    "&responseTime=" +
    responseTime +
    "&resultCode=" +
    resultCode +
    "&transId=" +
    transId
  );
}

/** [MOMO] So sánh chữ ký MoMo gửi về với chữ ký hệ thống tự tính. Ctrl+F: verifyIpnSignature */
function verifyIpnSignature(payload, { accessKey, secretKey }) {
  // Tự dựng lại chuỗi raw signature ĐÚNG thứ tự field theo chuẩn MoMo từ dữ liệu webhook.
  const raw = buildIpnRawSignature({
    accessKey,
    amount: payload.amount,
    extraData: payload.extraData || "",
    message: payload.message || "",
    orderId: payload.orderId,
    orderInfo: payload.orderInfo || "",
    orderType: payload.orderType || "",
    partnerCode: payload.partnerCode,
    payType: payload.payType || "",
    requestId: payload.requestId,
    responseTime: payload.responseTime,
    resultCode: payload.resultCode,
    transId: payload.transId,
  });
  // Ký lại chuỗi raw bằng secretKey của mình → chữ ký kỳ vọng.
  const expected = hmacSha256(raw, secretKey);
  // So khớp (không phân biệt hoa/thường) với chữ ký MoMo gửi kèm → chống giả mạo webhook.
  return String(expected).toLowerCase() === String(payload.signature || "").toLowerCase();
}

/** [MOMO] Nhét orderId/reservationId vào extraData base64 để webhook biết order nào. Ctrl+F: encodeExtraData */
function encodeExtraData(obj) {
  const json = JSON.stringify(obj || {});
  return Buffer.from(json, "utf8").toString("base64");
}

/** [MOMO] Đọc extraData từ webhook, lỗi thì trả object rỗng để không crash server. Ctrl+F: decodeExtraData */
function decodeExtraData(extraData) {
  try {
    // Rỗng → object rỗng.
    if (!extraData) return {};
    // Giải base64 về JSON string rồi parse thành object (chứa order_id/reservation_id...).
    const json = Buffer.from(extraData, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    // Dữ liệu hỏng/không parse được → trả rỗng để KHÔNG làm sập server khi nhận webhook lạ.
    return {};
  }
}

module.exports = {
  hmacSha256,
  buildCreateRawSignature,
  verifyIpnSignature,
  encodeExtraData,
  decodeExtraData,
};

