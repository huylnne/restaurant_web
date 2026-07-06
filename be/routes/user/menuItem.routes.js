/**
 * ROUTES PUBLIC MENU ITEMS — API thực đơn khách xem theo chi nhánh.
 * Ctrl+F: menu item routes, /menu-items, featured, highlights
 * Luồng demo: Phần 2 — Bước 2.1 khách xem thực đơn.
 */
const express = require("express");
const router = express.Router();
const menuItemController = require("../../controllers/user/menuItem.controller");

// [THỰC ĐƠN] Món nổi bật trên trang chủ/menu.
router.get("/featured", menuItemController.getFeaturedMenuItems);

// [THỰC ĐƠN] Món khuyến mãi/bán chạy theo chi nhánh.
router.get("/highlights", menuItemController.getMenuHighlights);

// [THỰC ĐƠN] Danh sách tất cả món, filter theo branch/category/search.
router.get("/", menuItemController.getAllMenuItems);

module.exports = router;
