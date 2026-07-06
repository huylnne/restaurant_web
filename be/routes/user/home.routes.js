/**
 * ROUTES HOME/PUBLIC — API trang chủ, giới thiệu, danh sách chi nhánh, chi nhánh gần người dùng.
 * Ctrl+F: home routes, featured-dishes, branches, branches nearby
 * Luồng demo: Phần 2 — khách xem món nổi bật và chi nhánh.
 */
const express = require('express');
const router = express.Router();
const homeController = require('../../controllers/user/home.controller');

// [TRANG CHỦ] Món nổi bật.
router.get('/featured-dishes', homeController.getFeaturedDishes);
// [TRANG CHỦ] Danh mục món.
router.get('/menu-categories', homeController.getMenuCategories);
// [TRANG CHỦ] Nội dung giới thiệu nhà hàng.
router.get('/introduction', homeController.getIntroduction);
// [CHI NHÁNH] Danh sách chi nhánh toàn hệ thống.
router.get('/branches', homeController.getBranches);
// [CHI NHÁNH] Sắp xếp chi nhánh theo khoảng cách từ tọa độ khách.
router.get('/branches/nearby', homeController.getBranchesNearby);

module.exports = router;
