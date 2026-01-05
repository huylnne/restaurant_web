const express = require('express');
const router = express.Router();
const employeeController = require('../../controllers/admin/employee.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth'); // Đúng tên export

// Tất cả routes đều cần verifyToken và isAdmin
router.use(verifyToken);
router.use(isAdmin);

// GET /api/admin/employees - Lấy danh sách nhân viên
router.get('/', employeeController.getEmployees);

// GET /api/admin/employees/stats/:branch_id - Lấy thống kê nhân viên
router.get('/stats/:branch_id', employeeController.getEmployeeStats);

// GET /api/admin/employees/:id - Lấy thông tin 1 nhân viên
router.get('/:id', employeeController.getEmployeeById);

// POST /api/admin/employees - Thêm nhân viên mới
router.post('/', employeeController.createEmployee);

// PUT /api/admin/employees/:id - Cập nhật nhân viên
router.put('/:id', employeeController.updateEmployee);

// DELETE /api/admin/employees/:id - Xóa nhân viên
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;