const express = require('express');
const router = express.Router();
const { createReservation } = require('../../controllers/user/reservationController');
const verifyToken = require('../../middlewares/auth');
const reservationController = require('../../controllers/user/reservationController');
const authMiddleware = require('../../middlewares/auth');


router.post('/', verifyToken, createReservation); // ✅ middleware phải nằm trước controller
router.get('/available', reservationController.getAvailableTables);
router.get('/my', authMiddleware, reservationController.getUserReservations);


module.exports = router;
