const express = require('express');
const router = express.Router();
const reservationController = require('../../controllers/user/reservation.controller');
const { verifyToken } = require('../../middlewares/auth');  // ✅ Destructuring import

// ✅ Tạo đặt bàn mới
router.post('/', verifyToken, reservationController.createReservation);

// ✅ Lấy bàn trống (không cần auth)
router.get('/available', reservationController.getAvailableTables);

// ✅ Lấy lịch sử đặt bàn của user
router.get('/my', verifyToken, reservationController.getUserReservations);

// ✅ Hủy đặt bàn
router.put('/:id/cancel', verifyToken, reservationController.cancelReservation);

// ✅ User gọi nhân viên thanh toán cho bàn hiện tại
router.post('/request-bill', verifyToken, reservationController.requestBill);

module.exports = router;