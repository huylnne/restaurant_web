// routes/admin/menu.routes.js
const express = require("express");
const router = express.Router();
const adminMenuController = require("../../controllers/admin/menu.controller");
const { verifyAdmin } = require("../../middlewares/auth");

// Danh sách menu
router.get("/", verifyAdmin, adminMenuController.getAll);

// Xem chi tiết 1 menu
router.get("/:id", verifyAdmin, adminMenuController.getById);

// Tạo mới menu
router.post("/", verifyAdmin, adminMenuController.create);

// Cập nhật menu
router.put("/:id", verifyAdmin, adminMenuController.update);

// Xóa menu
router.delete("/:id", verifyAdmin, adminMenuController.remove);

module.exports = router;
