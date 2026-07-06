/**
 * ROUTES KITCHEN — API màn bếp: lấy hàng đợi món và cập nhật trạng thái chế biến.
 * Ctrl+F: kitchen routes, /admin/kitchen, order-items, trạng thái món
 * Luồng demo: Phần 3 — Bước 3.4 bếp pending → processing → done.
 */
const express = require('express');
const router = express.Router();
const kitchenController = require('../../controllers/admin/kitchen.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

// [PHÂN QUYỀN] Chỉ admin/kitchen được vào hàng đợi bếp.
router.use(verifyToken, authorizeRole('admin', 'kitchen'));

// [BẾP] Lấy món theo status + branch để hiển thị theo bàn.
router.get('/order-items', kitchenController.listOrderItems);

// [BẾP] Cập nhật trạng thái một món và ghi audit.
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