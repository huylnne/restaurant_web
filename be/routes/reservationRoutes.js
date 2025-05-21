const express = require('express');
const router = express.Router();
const { createReservation } = require('../controllers/reservationController');
const verifyToken = require('../middlewares/auth');


router.post('/', verifyToken, createReservation); // ✅ middleware phải nằm trước controller


module.exports = router;
