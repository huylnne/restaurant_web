const express = require("express");
const router = express.Router();
const adminMenuController = require("../../controllers/admin/menu.controller");
const { verifyToken, isAdmin } = require("../../middlewares/auth");

// Danh sách menu - GET /api/admin/menu
router.get("/", verifyToken, isAdmin, adminMenuController.getAll);

// Xem chi tiết 1 menu - GET /api/admin/menu/:id
router.get("/:id", verifyToken, isAdmin, adminMenuController.getById);

// Tạo mới menu - POST /api/admin/menu
router.post("/", verifyToken, isAdmin, adminMenuController.create);

// Cập nhật menu - PUT /api/admin/menu/:id
router.put("/:id", verifyToken, isAdmin, adminMenuController.update);

// Xóa menu - DELETE /api/admin/menu/:id
router.delete("/:id", verifyToken, isAdmin, adminMenuController.remove);

module.exports = router;