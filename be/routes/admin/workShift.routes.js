/**
 * ROUTES ADMIN WORK SHIFT — API quản lý ca làm việc nhân viên.
 * Ctrl+F: workShift routes, /admin/work-shifts
 */
const express = require("express");
const router = express.Router();
const workShiftController = require("../../controllers/admin/workShift.controller");
const { verifyToken, authorizeRole } = require("../../middlewares/auth");
const { auditLog } = require("../../middlewares/operationLog");

const enforceManagerBranchScope = (req, res, next) => {
  const role = req.userRole || req.user?.role;
  if (role !== "manager") return next();

  const userBranchId = parseInt(req.user?.branch_id, 10);
  if (!Number.isFinite(userBranchId)) {
    return res.status(403).json({ message: "Tài khoản manager chưa được gán chi nhánh" });
  }

  const requestedRaw = req.query.branchId ?? req.body?.branch_id;
  if (requestedRaw !== undefined) {
    const requestedBranchId = parseInt(requestedRaw, 10);
    if (Number.isFinite(requestedBranchId) && requestedBranchId !== userBranchId) {
      return res.status(403).json({ message: "Manager chỉ được quản lý ca của chi nhánh được phân công" });
    }
  }

  if (req.query.branchId !== undefined) req.query.branchId = String(userBranchId);
  if (req.body && req.body.branch_id !== undefined) req.body.branch_id = userBranchId;
  return next();
};

router.use(verifyToken, authorizeRole("admin", "manager"), enforceManagerBranchScope);

router.get("/on-duty", workShiftController.getOnDutyWaiters);
router.get("/employees", workShiftController.getBranchEmployees);
router.get("/", workShiftController.listWorkShifts);
router.get("/:id", workShiftController.getWorkShiftById);

router.post(
  "/",
  auditLog({
    action: "WORK_SHIFT_CREATE",
    module: "work_shifts",
    description: "Tạo ca làm việc",
    entityType: "work_shift",
  }),
  workShiftController.createWorkShift
);

router.put(
  "/:id",
  auditLog({
    action: "WORK_SHIFT_UPDATE",
    module: "work_shifts",
    description: (req) => `Cập nhật ca làm #${req.params.id}`,
    entityType: "work_shift",
  }),
  workShiftController.updateWorkShift
);

router.delete(
  "/:id",
  auditLog({
    action: "WORK_SHIFT_DELETE",
    module: "work_shifts",
    description: (req) => `Xóa ca làm #${req.params.id}`,
    entityType: "work_shift",
  }),
  workShiftController.deleteWorkShift
);

module.exports = router;
