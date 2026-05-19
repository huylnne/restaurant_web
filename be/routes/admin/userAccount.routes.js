const express = require('express');
const router = express.Router();
const userAccountController = require('../../controllers/admin/userAccount.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

router.use(verifyToken, isAdmin);

router.get('/stats/summary', userAccountController.getSummary);
router.get('/', userAccountController.listUsers);
router.get('/:id', userAccountController.getUserById);

router.patch(
  '/:id/account-status',
  auditLog({
    action: 'USER_ACCOUNT_STATUS',
    module: 'users',
    description: (req) => `Đổi trạng thái tài khoản #${req.params.id}`,
    entityType: 'user',
  }),
  userAccountController.updateAccountStatus
);

module.exports = router;
