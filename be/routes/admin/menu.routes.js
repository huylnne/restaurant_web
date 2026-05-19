const express = require("express");
const router = express.Router();
const adminMenuController = require("../../controllers/admin/menu.controller");
const { verifyToken, authorizeRole } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");

router.get("/", verifyToken, authorizeRole("admin", "waiter"), adminMenuController.getAll);
router.get("/:id", verifyToken, authorizeRole("admin", "waiter"), adminMenuController.getById);

router.post(
  "/",
  verifyToken,
  authorizeRole("admin"),
  auditLog({
    action: "MENU_CREATE",
    module: "menu",
    description: "Thêm món ăn",
    entityType: "menu_item",
  }),
  adminMenuController.create
);

router.put(
  "/:id",
  verifyToken,
  authorizeRole("admin"),
  auditLog({
    action: "MENU_UPDATE",
    module: "menu",
    description: (req) => `Cập nhật món #${req.params.id}`,
    entityType: "menu_item",
  }),
  adminMenuController.update
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRole("admin"),
  auditLog({
    action: "MENU_DELETE",
    module: "menu",
    description: (req) => `Xóa món #${req.params.id}`,
    entityType: "menu_item",
  }),
  adminMenuController.remove
);

module.exports = router;