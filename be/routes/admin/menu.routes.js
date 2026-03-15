const express = require("express");
const router = express.Router();
const adminMenuController = require("../../controllers/admin/menu.controller");
const { verifyToken, authorizeRole } = require("../../middlewares/auth");

// Đọc: admin, waiter (kitchen chỉ dùng tab Bếp)
router.get("/", verifyToken, authorizeRole("admin", "waiter"), adminMenuController.getAll);
router.get("/:id", verifyToken, authorizeRole("admin", "waiter"), adminMenuController.getById);

// Ghi: chỉ admin
router.post("/", verifyToken, authorizeRole("admin"), adminMenuController.create);
router.put("/:id", verifyToken, authorizeRole("admin"), adminMenuController.update);
router.delete("/:id", verifyToken, authorizeRole("admin"), adminMenuController.remove);

module.exports = router;