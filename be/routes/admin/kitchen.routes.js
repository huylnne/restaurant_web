const express = require('express');
const router = express.Router();
const kitchenController = require('../../controllers/admin/kitchen.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

router.use(verifyToken, authorizeRole('admin', 'kitchen'));

router.get('/order-items', kitchenController.listOrderItems);

router.patch(
  '/order-items/:id/status',
  auditLog({
    action: 'KITCHEN_ITEM_STATUS',
    module: 'kitchen',
    description: (req) => `Đổi trạng thái món bếp #${req.params.id}`,
    entityType: 'order_item',
  }),
  kitchenController.changeOrderItemStatus
);

module.exports = router;