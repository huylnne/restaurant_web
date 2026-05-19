const express = require("express");
const router = express.Router();
const branchController = require("../../controllers/admin/branch.controller");
const { verifyToken, authorizeRole, isAdmin } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");

router.use(verifyToken);

router.get("/my", authorizeRole("manager", "admin"), branchController.getMyBranch);
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

router.get("/", isAdmin, branchController.getBranches);
router.get("/:id", isAdmin, branchController.getBranchById);
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
