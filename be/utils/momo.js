const crypto = require("crypto");

function hmacSha256(rawSignature, secretKey) {
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

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

function verifyIpnSignature(payload, { accessKey, secretKey }) {
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
  const expected = hmacSha256(raw, secretKey);
  return String(expected).toLowerCase() === String(payload.signature || "").toLowerCase();
}

function encodeExtraData(obj) {
  const json = JSON.stringify(obj || {});
  return Buffer.from(json, "utf8").toString("base64");
}

function decodeExtraData(extraData) {
  try {
    if (!extraData) return {};
    const json = Buffer.from(extraData, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
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

