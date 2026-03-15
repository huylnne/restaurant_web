const express = require('express');
const router = express.Router();
const kitchenController = require('../../controllers/admin/kitchen.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');

router.use(verifyToken, authorizeRole('admin', 'waiter', 'kitchen'));

router.get('/order-items', kitchenController.listOrderItems);
router.patch('/order-items/:id/status', kitchenController.changeOrderItemStatus);

module.exports = router;