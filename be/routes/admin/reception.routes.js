const express = require("express");
const router = express.Router();
const receptionController = require("../../controllers/admin/reception.controller");
const { verifyToken, authorizeRole } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");

router.use(verifyToken, authorizeRole("admin", "waiter"));

router.get("/upcoming", receptionController.listUpcomingArrivals);
router.get("/search", receptionController.searchArrivals);

router.get("/walk-in-tables", receptionController.getWalkInTables);

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
