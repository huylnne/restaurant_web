const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user/user.controller');
const authMW = require('../../middlewares/auth');


router.post('/register', userController.registerUser);
router.get('/me', authMW, userController.getProfile);
router.put('/me', authMW, userController.updateProfile);



router.post('/change-password', authMW, userController.changePassword);
router.get('/reservations', authMW, userController.getReservationsWithOrders);
module.exports = router;

