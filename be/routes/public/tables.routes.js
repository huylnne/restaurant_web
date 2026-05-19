const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/public/tables.controller");
const { verifyToken } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");

router.get("/by-token/:token", ctrl.getTableByToken);
router.get("/by-token/:token/bill", ctrl.getBillByToken);

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

module.exports = router;

