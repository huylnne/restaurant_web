const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/public/tables.controller");
const { verifyToken } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");
const { tableQrOrderLimiter } = require("../../middlewares/rateLimit");

router.get("/by-token/:token", ctrl.getTableByToken);
router.get("/by-token/:token/bill", ctrl.getBillByToken);

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

router.get("/by-token/:token/review-eligibility", ctrl.getReviewEligibility);

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

