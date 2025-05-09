const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// API cho trang chủ
router.get('/featured-dishes', homeController.getFeaturedDishes);
router.get('/menu-categories', homeController.getMenuCategories);
router.get('/introduction', homeController.getIntroduction);
router.get('/branches', homeController.getBranches);

module.exports = router;
