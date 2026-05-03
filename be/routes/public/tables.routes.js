const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/public/tables.controller");
const { verifyToken } = require("../../middlewares/auth");

// Public: resolve QR token -> table basic info
router.get("/by-token/:token", ctrl.getTableByToken);

// Public: bill tạm tính theo token (ai scan QR bàn cũng xem được)
router.get("/by-token/:token/bill", ctrl.getBillByToken);

// Auth: check-in vào bàn bằng token để tạo phiên (reservation) "ngồi tại bàn"
router.post("/by-token/:token/checkin", verifyToken, ctrl.checkinByToken);

module.exports = router;

