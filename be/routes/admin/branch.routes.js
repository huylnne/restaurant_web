/**
 * ROUTES ADMIN BRANCH — API quản lý chi nhánh và chi nhánh manager phụ trách.
 * Ctrl+F: branch routes, /admin/branches, getMyBranch, deactivate
 * Luồng demo: Phần 5 — Bước 5.3 quản lý chi nhánh.
 */
const express = require("express");
const router = express.Router();
const branchController = require("../../controllers/admin/branch.controller");
const { verifyToken, authorizeRole, isAdmin } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");

// [AUTH] Mọi route chi nhánh đều cần đăng nhập.
router.use(verifyToken);

// [MANAGER] Manager/admin xem chi nhánh mình phụ trách.
router.get("/my", authorizeRole("manager", "admin"), branchController.getMyBranch);
// [MANAGER] Manager cập nhật thông tin chi nhánh của mình.
router.put(
  "/my",
  authorizeRole("manager", "admin"),
  auditLog({
    action: "BRANCH_UPDATE_MY",
    module: "branches",
    description: "Manager cập nhật chi nhánh phụ trách",
    entityType: "branch",
  }),
  branchController.updateMyBranch
);

// [ADMIN] Danh sách toàn bộ chi nhánh.
router.get("/", isAdmin, branchController.getBranches);
// [ADMIN] Chi tiết một chi nhánh.
router.get("/:id", isAdmin, branchController.getBranchById);
// [ADMIN] Tạo chi nhánh mới.
router.post(
  "/",
  isAdmin,
  auditLog({
    action: "BRANCH_CREATE",
    module: "branches",
    description: "Tạo chi nhánh mới",
    entityType: "branch",
  }),
  branchController.createBranch
);
// [ADMIN] Cập nhật chi nhánh bất kỳ.
router.put(
  "/:id",
  isAdmin,
  auditLog({
    action: "BRANCH_UPDATE",
    module: "branches",
    description: (req) => `Cập nhật chi nhánh #${req.params.id}`,
    entityType: "branch",
  }),
  branchController.updateBranch
);
// [ADMIN] Vô hiệu hóa chi nhánh thay vì xóa cứng.
router.patch(
  "/:id/deactivate",
  isAdmin,
  auditLog({
    action: "BRANCH_DEACTIVATE",
    module: "branches",
    description: (req) => `Vô hiệu hóa chi nhánh #${req.params.id}`,
    entityType: "branch",
  }),
  branchController.deactivateBranch
);

module.exports = router;
