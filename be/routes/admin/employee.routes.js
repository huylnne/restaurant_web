const express = require('express');
const router = express.Router();
const employeeController = require('../../controllers/admin/employee.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

router.use(verifyToken);
router.use(isAdmin);

router.get('/', employeeController.getEmployees);
router.get('/stats/:branch_id', employeeController.getEmployeeStats);
router.get('/:id', employeeController.getEmployeeById);

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