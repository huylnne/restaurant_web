/**
 * ROUTES ADMIN EMPLOYEE — API quản lý nhân viên và tài khoản staff theo chi nhánh.
 * Ctrl+F: employee routes, /admin/employees, waiter1, kitchen1, manager
 * Luồng demo: Phần 5 — Bước 5.5 quản lý nhân viên.
 */
const express = require('express');
const router = express.Router();
const employeeController = require('../../controllers/admin/employee.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

// [AUTH] Phải đăng nhập.
router.use(verifyToken);
// [PHÂN QUYỀN] Chỉ admin được quản lý nhân viên.
router.use(isAdmin);

// [NHÂN VIÊN] Danh sách nhân viên, filter theo chi nhánh.
router.get('/', employeeController.getEmployees);
// [NHÂN VIÊN] Thống kê nhân sự theo chi nhánh.
router.get('/stats/:branch_id', employeeController.getEmployeeStats);
// [NHÂN VIÊN] Chi tiết nhân viên.
router.get('/:id', employeeController.getEmployeeById);

// [NHÂN VIÊN] Thêm nhân viên mới + tài khoản đăng nhập tương ứng.
router.post(
  '/',
  auditLog({
    action: 'EMPLOYEE_CREATE',
    module: 'employees',
    description: 'Thêm nhân viên mới',
    entityType: 'employee',
  }),
  employeeController.createEmployee
);

// [NHÂN VIÊN] Cập nhật thông tin/vai trò/chi nhánh nhân viên.
router.put(
  '/:id',
  auditLog({
    action: 'EMPLOYEE_UPDATE',
    module: 'employees',
    description: (req) => `Cập nhật nhân viên #${req.params.id}`,
    entityType: 'employee',
  }),
  employeeController.updateEmployee
);

// [NHÂN VIÊN] Xóa nhân viên.
router.delete(
  '/:id',
  auditLog({
    action: 'EMPLOYEE_DELETE',
    module: 'employees',
    description: (req) => `Xóa nhân viên #${req.params.id}`,
    entityType: 'employee',
  }),
  employeeController.deleteEmployee
);

module.exports = router;