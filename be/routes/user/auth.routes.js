const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/auth.controller');

//  Route đăng ký
router.post('/register', authController.register);

//  Route đăng nhập
router.post('/login', authController.login);

//  Kiểm tra SĐT đã được đăng ký chưa (dùng cho realtime check ở form đăng ký)
router.get('/check-phone', authController.checkPhone);

module.exports = router;