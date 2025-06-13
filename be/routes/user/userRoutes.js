const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user/userController');
const authMW = require('../../middlewares/auth');

router.post('/register', userController.registerUser);
router.get('/me', authMW, userController.getProfile);
router.put('/me', authMW, userController.updateProfile);

// ✅ THÊM route đổi mật khẩu
router.post('/change-password', authMW, userController.changePassword);

module.exports = router;

