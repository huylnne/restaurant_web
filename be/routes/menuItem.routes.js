const express = require("express");
const router = express.Router();
const menuItemController = require("../controllers/menuItem.controller");

// GET /api/menu-items/featured
router.get("/featured", menuItemController.getFeaturedMenuItems);

module.exports = router;
