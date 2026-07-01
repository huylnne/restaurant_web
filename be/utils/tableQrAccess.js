const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./jwt");

const TABLE_QR_ORDER_TYP = "table_qr_order";
const TABLE_QR_ORDER_EXPIRES_IN = "4h";

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

function verifyTableOrderAccessToken(token) {
  const payload = jwt.verify(token, getJwtSecret());
  if (payload?.typ !== TABLE_QR_ORDER_TYP) {
    const err = new Error("ORDER_ACCESS_INVALID");
    throw err;
  }
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
