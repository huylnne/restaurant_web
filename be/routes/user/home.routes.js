const express = require('express');
const router = express.Router();
const homeController = require('../../controllers/user/home.controller');

// API cho trang chủ
router.get('/featured-dishes', homeController.getFeaturedDishes);
router.get('/menu-categories', homeController.getMenuCategories);
router.get('/introduction', homeController.getIntroduction);
router.get('/branches', homeController.getBranches);
router.get('/branches/nearby', homeController.getBranchesNearby);

module.exports = router;
