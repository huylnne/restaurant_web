/**
 * CONTROLLER ADMIN WORK SHIFT — HTTP layer quản lý ca làm việc nhân viên.
 * Ctrl+F: workShift controller, listWorkShifts, createWorkShift
 */
const workShiftService = require("../../services/admin/workShift.service");
const { resolveBranchId } = require("../../utils/branchScope");

class WorkShiftController {
  async listWorkShifts(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const result = await workShiftService.listWorkShifts(branchId, req.query || {});
      res.json(result);
    } catch (error) {
      console.error("workShift.listWorkShifts:", error);
      res.status(500).json({ message: error.message || "Lỗi tải lịch ca" });
    }
  }

  async getWorkShiftById(req, res) {
    try {
      const shift = await workShiftService.getWorkShiftById(req.params.id);
      res.json(shift);
    } catch (error) {
      const status = error.code === "NOT_FOUND" ? 404 : 500;
      res.status(status).json({ message: error.message });
    }
  }

  async createWorkShift(req, res) {
    try {
      const payload = {
        ...req.body,
        branch_id: resolveBranchId(req, req.body.branch_id || req.query.branchId, 1),
      };
      const shift = await workShiftService.createWorkShift(payload);
      req.audit = {
        entityId: shift.shift_id,
        description: `Tạo ca làm #${shift.shift_id} cho NV #${shift.employee_id}`,
      };
      res.status(201).json(shift);
    } catch (error) {
      const status = ["INVALID_EMPLOYEE", "SHIFT_OVERLAP", "INVALID_SHIFT_TIME", "INVALID_SHIFT_RANGE"].includes(
        error.code
      )
        ? 400
        : 500;
      res.status(status).json({ message: error.message, code: error.code });
    }
  }

  async updateWorkShift(req, res) {
    try {
      const payload = {
        ...req.body,
        branch_id: resolveBranchId(req, req.body.branch_id || req.query.branchId, 1),
      };
      const shift = await workShiftService.updateWorkShift(req.params.id, payload);
      res.json(shift);
    } catch (error) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : ["INVALID_EMPLOYEE", "SHIFT_OVERLAP", "INVALID_SHIFT_TIME", "INVALID_SHIFT_RANGE"].includes(error.code)
            ? 400
            : 500;
      res.status(status).json({ message: error.message, code: error.code });
    }
  }

  async deleteWorkShift(req, res) {
    try {
      const result = await workShiftService.deleteWorkShift(req.params.id);
      res.json(result);
    } catch (error) {
      const status = error.code === "NOT_FOUND" ? 404 : 500;
      res.status(status).json({ message: error.message });
    }
  }

  async getOnDutyWaiters(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const waiters = await workShiftService.getOnDutyWaiters(branchId);
      res.json({ waiters });
    } catch (error) {
      console.error("workShift.getOnDutyWaiters:", error);
      res.status(500).json({ message: error.message || "Lỗi tải danh sách phục vụ" });
    }
  }

  async getBranchEmployees(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const employees = await workShiftService.getBranchEmployees(branchId);
      res.json({ employees });
    } catch (error) {
      console.error("workShift.getBranchEmployees:", error);
      res.status(500).json({ message: error.message || "Lỗi tải nhân viên" });
    }
  }
}

module.exports = new WorkShiftController();
