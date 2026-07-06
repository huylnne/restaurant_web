/**
 * ROUTES ADMIN MENU — API quản lý món ăn theo chi nhánh.
 * Ctrl+F: admin menu routes, /admin/menu, MENU_CREATE, MENU_UPDATE
 * Luồng demo: Phần 5 — Bước 5.4 Admin xem/quản lý món ăn.
 */
const express = require("express");
const router = express.Router();
const adminMenuController = require("../../controllers/admin/menu.controller");
const { verifyToken, authorizeRole } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");

// [PHÂN QUYỀN CHI NHÁNH] Manager chỉ CRUD/xem menu đúng chi nhánh được gán.
const enforceMenuBranchScope = (req, res, next) => {
  const role = req.userRole || req.user?.role;
  if (role !== "manager") return next();

  const userBranchId = parseInt(req.user?.branch_id, 10);
  if (!Number.isFinite(userBranchId)) {
    return res
      .status(403)
      .json({ message: "Tài khoản manager chưa được gán chi nhánh" });
  }

  const requestedRaw =
    req.query.branchId ?? req.query.branch_id ?? req.body?.branch_id;
  if (requestedRaw !== undefined && requestedRaw !== null && requestedRaw !== "") {
    const requestedBranchId = parseInt(requestedRaw, 10);
    if (Number.isFinite(requestedBranchId) && requestedBranchId !== userBranchId) {
      return res
        .status(403)
        .json({ message: "Manager chỉ được quản lý món của chi nhánh được phân công" });
    }
  }

  req.query.branchId = String(userBranchId);
  req.query.branch_id = String(userBranchId);
  if (req.body && typeof req.body === "object") {
    req.body.branch_id = userBranchId;
  }
  return next();
};

// [QUẢN LÝ MÓN] Danh sách món theo chi nhánh, admin/waiter/manager được xem.
router.get(
  "/",
  verifyToken,
  authorizeRole("admin", "waiter", "manager"),
  enforceMenuBranchScope,
  adminMenuController.getAll
);
// [QUẢN LÝ MÓN] Chi tiết một món.
router.get(
  "/:id",
  verifyToken,
  authorizeRole("admin", "waiter", "manager"),
  enforceMenuBranchScope,
  adminMenuController.getById
);

// [QUẢN LÝ MÓN] Admin/manager thêm món mới.
router.post(
  "/",
  verifyToken,
  authorizeRole("admin", "manager"),
  enforceMenuBranchScope,
  auditLog({
    action: "MENU_CREATE",
    module: "menu",
    description: "Thêm món ăn",
    entityType: "menu_item",
  }),
  adminMenuController.create
);

// [QUẢN LÝ MÓN] Admin/manager cập nhật món, giá, sale, trạng thái bán.
router.put(
  "/:id",
  verifyToken,
  authorizeRole("admin", "manager"),
  enforceMenuBranchScope,
  auditLog({
    action: "MENU_UPDATE",
    module: "menu",
    description: (req) => `Cập nhật món #${req.params.id}`,
    entityType: "menu_item",
  }),
  adminMenuController.update
);

// [QUẢN LÝ MÓN] Admin/manager xóa món.
router.delete(
  "/:id",
  verifyToken,
  authorizeRole("admin", "manager"),
  enforceMenuBranchScope,
  auditLog({
    action: "MENU_DELETE",
    module: "menu",
    description: (req) => `Xóa món #${req.params.id}`,
    entityType: "menu_item",
  }),
  adminMenuController.remove
);

module.exports = router;