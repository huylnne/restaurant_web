/**
 * ROUTES RECEPTION — API tiếp nhận khách đặt trước và xếp khách vãng lai.
 * Ctrl+F: reception routes, /check-in, /walk-in, /upcoming
 * Luồng demo: Phần 3 — Bước 3.2 phục vụ check-in khách demo_khach01.
 */
const express = require("express");
const router = express.Router();
const receptionController = require("../../controllers/admin/reception.controller");
const { verifyToken, authorizeRole } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");

// [PHÂN QUYỀN] Admin/waiter được tiếp nhận khách ở chi nhánh.
router.use(verifyToken, authorizeRole("admin", "waiter"));

// [TIẾP NHẬN] Danh sách khách sắp đến trong 7 ngày.
router.get("/upcoming", receptionController.listUpcomingArrivals);
// [TIẾP NHẬN] Tìm theo tên/SĐT/mã order.
router.get("/search", receptionController.searchArrivals);

// [WALK-IN] Danh sách bàn trống không vướng đặt trước sắp tới.
router.get("/walk-in-tables", receptionController.getWalkInTables);

// [CHECK-IN] Tiếp nhận khách đã đặt bàn online.
router.post(
  "/check-in",
  auditLog({
    action: "RECEPTION_CHECK_IN",
    module: "tables",
    description: "Tiếp nhận khách có đặt trước",
    entityType: "reservation",
  }),
  receptionController.confirmArrival
);

// [WALK-IN] Xếp khách vãng lai vào bàn trống.
router.post(
  "/walk-in",
  auditLog({
    action: "RECEPTION_WALK_IN",
    module: "tables",
    description: "Tiếp nhận khách vãng lai",
    entityType: "reservation",
  }),
  receptionController.walkInCheckIn
);

module.exports = router;
