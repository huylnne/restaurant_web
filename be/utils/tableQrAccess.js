/**
 * UTIL TABLE QR ACCESS — token ngắn hạn cho quyền gọi món qua QR bàn.
 * Ctrl+F: table QR access, order_access_token, signTableOrderAccessToken, verifyTableOrderAccessToken
 * Luồng demo: Phần 4 — khách mở /t/{token}, chỉ gọi món nếu bàn đang active.
 */
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./jwt");

/** [QR GỌI MÓN] typ riêng để không nhầm JWT đăng nhập user với token gọi món bàn. Ctrl+F: TABLE_QR_ORDER_TYP */
const TABLE_QR_ORDER_TYP = "table_qr_order";
const TABLE_QR_ORDER_EXPIRES_IN = "4h";

/** [QR GỌI MÓN] Ký token chứa table_id + order_id, hết hạn sau 4h. Ctrl+F: signTableOrderAccessToken */
function signTableOrderAccessToken({ table_id, order_id }) {
  return jwt.sign(
    {
      table_id: Number(table_id),
      order_id: Number(order_id),
      typ: TABLE_QR_ORDER_TYP,
    },
    getJwtSecret(),
    { expiresIn: TABLE_QR_ORDER_EXPIRES_IN }
  );
}

/** [QR GỌI MÓN] Verify token gọi món, trả về table_id/order_id để service kiểm tiếp active session. Ctrl+F: verifyTableOrderAccessToken */
function verifyTableOrderAccessToken(token) {
  // Verify chữ ký + hạn dùng của token (hết hạn/sai chữ ký sẽ ném lỗi ở đây).
  const payload = jwt.verify(token, getJwtSecret());
  // Chặn dùng nhầm JWT đăng nhập user làm token gọi món: bắt buộc đúng "typ" riêng.
  if (payload?.typ !== TABLE_QR_ORDER_TYP) {
    const err = new Error("ORDER_ACCESS_INVALID");
    throw err;
  }
  // Trả về bàn + order để service kiểm tra tiếp (bàn còn active mới cho gọi món).
  return {
    table_id: Number(payload.table_id),
    order_id: Number(payload.order_id),
  };
}

module.exports = {
  TABLE_QR_ORDER_TYP,
  signTableOrderAccessToken,
  verifyTableOrderAccessToken,
};
