const express = require("express");
const router = express.Router();
const branchController = require("../../controllers/admin/branch.controller");
const { verifyToken, authorizeRole, isAdmin } = require("../../middlewares/auth");

router.use(verifyToken);

// Manager (UC15): xem/sửa chi nhánh mình phụ trách
router.get("/my", authorizeRole("manager", "admin"), branchController.getMyBranch);
router.put("/my", authorizeRole("manager", "admin"), branchController.updateMyBranch);

// Admin (UC16): CRUD toàn hệ thống
router.get("/", isAdmin, branchController.getBranches);
router.get("/:id", isAdmin, branchController.getBranchById);
router.post("/", isAdmin, branchController.createBranch);
router.put("/:id", isAdmin, branchController.updateBranch);
router.patch("/:id/deactivate", isAdmin, branchController.deactivateBranch);

module.exports = router;
