/**
 * ROUTES USER ORDER — API đặt món trước gắn vào reservation.
 * Ctrl+F: order routes, pre-order, ORDER_PREORDER
 * Luồng demo: Phần 2 — Bước 2.3 khách bật Đặt món trước.
 */
const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/user/order.controller");
const { auditLog } = require("../../middlewares/operationLog");

// [ĐẶT MÓN TRƯỚC] Tạo OrderItem pending cho reservation, để bếp thấy khi check-in/gần giờ phục vụ.
router.post(
  "/",
  auditLog({
    action: "ORDER_PREORDER",
    module: "orders",
    description: "Đặt món trước (pre-order)",
    entityType: "order",
  }),
  orderController.createOrder
);

module.exports = router;
