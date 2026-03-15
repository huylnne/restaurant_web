const express = require('express');
const router = express.Router();
const waiterController = require('../../controllers/admin/waiter.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');

// Chỉ admin, waiter (kitchen không tạo đơn / phục vụ bàn)
router.use(verifyToken, authorizeRole('admin', 'waiter'));

router.post('/orders', waiterController.createOrder);
router.get('/orders', waiterController.listOrdersByTable);
router.patch('/order-items/:id/served', waiterController.serveOrderItem);
router.patch('/tables/:id/status', waiterController.updateTableStatus);

module.exports = router;