const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/user/order.controller");
const { auditLog } = require("../../middlewares/operationLog");

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
