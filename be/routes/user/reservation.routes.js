const express = require('express');
const router = express.Router();
const { createReservation } = require('../../controllers/user/reservation.controller');
const verifyToken = require('../../middlewares/auth');
const reservationController = require('../../controllers/user/reservation.controller');
const authMiddleware = require('../../middlewares/auth');


router.post('/', verifyToken, createReservation); // ✅ middleware phải nằm trước controller
router.get('/available', reservationController.getAvailableTables);
router.get('/my', authMiddleware, reservationController.getUserReservations);
router.put("/:id/cancel", authMiddleware, reservationController.cancelReservation);

module.exports = router;
