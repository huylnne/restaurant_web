const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user/user.controller');
const { verifyToken } = require('../../middlewares/auth');

// ✅ Routes cần auth
router.get('/me', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);
router.post('/change-password', verifyToken, userController.changePassword);
router.get('/reservations', verifyToken, userController.getReservationsWithOrders);

module.exports = router;