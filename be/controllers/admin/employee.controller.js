/**
 * CONTROLLER ADMIN EMPLOYEE — HTTP layer quản lý nhân viên/staff account.
 * Ctrl+F: employee controller, getEmployees, createEmployee, getEmployeeStats
 * Luồng demo: Phần 5 — Bước 5.5 quản lý nhân viên.
 */
const employeeService = require('../../services/admin/employee.service');
const { resolveBranchId } = require('../../utils/branchScope');

class EmployeeController {
  /** [NHÂN VIÊN] GET /api/admin/employees?branch_id=1&page=1&limit=10&search=. Ctrl+F: getEmployees */
  async getEmployees(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const branch_id = resolveBranchId(req, req.query.branch_id, 1);

      const result = await employeeService.getEmployeesByBranch(
        branch_id,
        page,
        limit,
        search
      );

      res.json(result);
    } catch (error) {
      console.error('Error in getEmployees:', error);
      res.status(500).json({ message: error.message });
    }
  }

  /** [NHÂN VIÊN] Chi tiết một nhân viên. Ctrl+F: getEmployeeById */
  async getEmployeeById(req, res) {
    try {
      const { id } = req.params;
      const employee = await employeeService.getEmployeeById(id);
      res.json(employee);
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      res.status(404).json({ message: error.message });
    }
  }

  /** [NHÂN VIÊN] Tạo nhân viên mới + user đăng nhập. Ctrl+F: createEmployee */
  async createEmployee(req, res) {
    try {
      const payload = {
        ...req.body,
        branch_id: resolveBranchId(req, req.body.branch_id, 1),
      };
      const employee = await employeeService.createEmployee(payload);
      req.audit = {
        entityId: employee.employee_id,
        description: `Thêm nhân viên #${employee.employee_id}`,
      };
      res.status(201).json(employee);
    } catch (error) {
      console.error('Error in createEmployee:', error);
      res.status(400).json({ message: error.message });
    }
  }

  /** [NHÂN VIÊN] Cập nhật hồ sơ/chức vụ/chi nhánh nhân viên. Ctrl+F: updateEmployee */
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const payload = {
        ...req.body,
        branch_id: resolveBranchId(req, req.body.branch_id, 1),
      };
      const employee = await employeeService.updateEmployee(id, payload);
      res.json(employee);
    } catch (error) {
      console.error('Error in updateEmployee:', error);
      res.status(400).json({ message: error.message });
    }
  }

  /** [NHÂN VIÊN] Xóa nhân viên. Ctrl+F: deleteEmployee */
  async deleteEmployee(req, res) {
    try {
      const { id } = req.params;
      const result = await employeeService.deleteEmployee(id);
      res.json(result);
    } catch (error) {
      console.error('Error in deleteEmployee:', error);
      res.status(400).json({ message: error.message });
    }
  }

  /** [NHÂN VIÊN] Thống kê nhân viên theo chi nhánh. Ctrl+F: getEmployeeStats */
  async getEmployeeStats(req, res) {
    try {
      const branch_id = resolveBranchId(req, req.params.branch_id, 1);
      const stats = await employeeService.getEmployeeStats(branch_id);
      res.json(stats);
    } catch (error) {
      console.error('Error in getEmployeeStats:', error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new EmployeeController();