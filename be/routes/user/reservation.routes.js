/**
 * ROUTES RESERVATION (KHÁCH) — API đặt bàn, kiểm bàn trống, lịch sử, hủy, yêu cầu thanh toán.
 * Ctrl+F: reservation routes, /available, /request-bill, đặt bàn routes
 * Luồng demo: Phần 2 đặt bàn, Phần 4 yêu cầu thanh toán.
 */
const express = require('express');
const router = express.Router();
const reservationController = require('../../controllers/user/reservation.controller');
const { verifyToken } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');
const { reservationCreateLimiter } = require('../../middlewares/rateLimit');
const { verifyReservationCaptcha } = require('../../middlewares/verifyCaptcha');
const { validateCreateReservationBody } = require('../../middlewares/validateReservationInput');

// [ĐẶT BÀN] Khách đăng nhập tạo booking online, có rate limit/CAPTCHA/audit.
router.post(
  '/',
  verifyToken,
  reservationCreateLimiter,
  validateCreateReservationBody,
  verifyReservationCaptcha,
  auditLog({
    action: 'RESERVATION_CREATE',
    module: 'reservations',
    description: 'Khách đặt bàn',
    entityType: 'reservation',
  }),
  reservationController.createReservation
);

// [ĐẶT BÀN] Preview bàn trống trước khi submit form /booking.
router.get('/available', reservationController.getAvailableTables);
// [DASHBOARD] Lịch sử đặt bàn đơn giản của khách đang đăng nhập.
router.get('/my', verifyToken, reservationController.getUserReservations);

// [HỦY ĐẶT BÀN] Khách hủy booking khi còn đủ điều kiện.
router.put(
  '/:id/cancel',
  verifyToken,
  auditLog({
    action: 'RESERVATION_CANCEL',
    module: 'reservations',
    description: (req) => `Hủy đặt bàn #${req.params.id}`,
    entityType: 'reservation',
  }),
  reservationController.cancelReservation
);

// [YÊU CẦU THANH TOÁN] Khách bấm nút chờ nhân viên thu tiền.
router.post(
  '/request-bill',
  verifyToken,
  auditLog({
    action: 'RESERVATION_REQUEST_BILL',
    module: 'reservations',
    description: 'Khách yêu cầu thanh toán',
    entityType: 'reservation',
  }),
  reservationController.requestBill
);

module.exports = router;