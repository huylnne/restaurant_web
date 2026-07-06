/**
 * ROUTES PUBLIC TABLE QR — API public cho trang /t/{token}: xem bàn, bill, gọi món, đánh giá.
 * Ctrl+F: public table routes, QR bàn, by-token, review-eligibility
 * Luồng demo: Phần 4 — khách mở link QR bàn.
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/public/tables.controller");
const { verifyToken } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");
const { tableQrOrderLimiter } = require("../../middlewares/rateLimit");

// [QR BÀN] Lấy thông tin bàn + token gọi món nếu phiên đang active.
router.get("/by-token/:token", ctrl.getTableByToken);
// [QR BÀN] Bill tạm tính qua token, không cần đăng nhập.
router.get("/by-token/:token/bill", ctrl.getBillByToken);

// [QR GỌI MÓN] Khách gọi món qua QR, có rate limit và audit.
router.post(
  "/by-token/:token/orders",
  tableQrOrderLimiter,
  auditLog({
    action: "TABLE_QR_ORDER_CREATE",
    module: "orders",
    description: "Khách gọi món qua QR bàn",
    entityType: "order",
    metadata: (req) => ({
      tableToken: req.params.token,
      itemCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
    }),
  }),
  ctrl.addOrderItemsByToken
);

// [QR CHECK-IN] Luồng phụ: khách đăng nhập tự check-in qua QR.
router.post(
  "/by-token/:token/checkin",
  verifyToken,
  auditLog({
    action: "TABLE_QR_CHECKIN",
    module: "tables",
    description: "Check-in bàn qua QR",
    entityType: "reservation",
    metadata: (req) => ({ tableToken: req.params.token }),
  }),
  ctrl.checkinByToken
);

// [QR ĐÁNH GIÁ] Kiểm tra order vừa thanh toán có được đánh giá chưa.
router.get("/by-token/:token/review-eligibility", ctrl.getReviewEligibility);

// [QR ĐÁNH GIÁ] Gửi review bằng token bàn sau khi thanh toán.
router.post(
  "/by-token/:token/reviews",
  auditLog({
    action: "TABLE_QR_REVIEW_CREATE",
    module: "reviews",
    description: "Khách đánh giá qua QR bàn",
    entityType: "review",
    metadata: (req) => ({
      tableToken: req.params.token,
      order_id: req.body?.order_id,
      rating: req.body?.rating,
    }),
  }),
  ctrl.createReviewByToken
);

module.exports = router;

