const express = require('express');
const router = express.Router();
const reservationController = require('../../controllers/user/reservation.controller');
const { verifyToken } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');
const { reservationCreateLimiter } = require('../../middlewares/rateLimit');
const { verifyReservationCaptcha } = require('../../middlewares/verifyCaptcha');
const { validateCreateReservationBody } = require('../../middlewares/validateReservationInput');

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

router.get('/available', reservationController.getAvailableTables);
router.get('/my', verifyToken, reservationController.getUserReservations);

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