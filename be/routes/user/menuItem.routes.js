const express = require("express");
const router = express.Router();
const menuItemController = require("../../controllers/user/menuItem.controller");

// GET /api/menu-items/featured
router.get("/featured", menuItemController.getFeaturedMenuItems);

// GET /api/menu-items/highlights?branch_id=1
router.get("/highlights", menuItemController.getMenuHighlights);

// GET /api/menu-items
router.get("/", menuItemController.getAllMenuItems);

module.exports = router;
