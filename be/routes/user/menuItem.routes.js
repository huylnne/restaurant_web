const express = require("express");
const router = express.Router();
const menuItemController = require("../../controllers/user/menuItem.controller");

// GET /api/menu-items/featured
router.get("/featured", menuItemController.getFeaturedMenuItems);

module.exports = router;
// GET /api/menu-items
router.get("/", menuItemController.getAllMenuItems);
