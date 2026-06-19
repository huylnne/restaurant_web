const kitchenService = require('../../services/admin/kitchen.service');
const { resolveBranchId } = require('../../utils/branchScope');
const realtimeHub = require('../../realtimeHub');

const kitchenController = {
  async listOrderItems(req, res) {
    try {
      const status = req.query.status || 'pending';
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const queue = await kitchenService.getOrderItemsByStatus(status, branchId);
      return res.json(queue);
    } catch (err) {
      console.error('kitchen.listOrderItems', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },

  async changeOrderItemStatus(req, res) {
    try {
      const id = req.params.id;
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'status is required' });
      const branchId = resolveBranchId(req, req.body.branchId || req.query.branchId, 1);

      const updated = await kitchenService.updateOrderItemStatus(id, status, branchId);
      const branchIdNum = Number(branchId);
      try {
        const plain = updated.toJSON ? updated.toJSON() : updated;
        const resolvedTable = plain.Order?.Table ?? null;
        realtimeHub.notifyBranch(branchIdNum, {
          type: 'order_item_status',
          order_item_id: Number(id),
          status: plain.status,
          table_id: resolvedTable?.table_id ?? plain.Order?.table_id ?? null,
          table_number: resolvedTable?.table_number ?? null,
          menu_name: plain.MenuItem?.name ?? null,
        });
      } catch (_) {
        realtimeHub.notifyBranch(branchIdNum, { type: 'order_item_status', order_item_id: Number(id), status });
      }
      return res.json(updated);
    } catch (err) {
      console.error('kitchen.changeOrderItemStatus', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },
};

module.exports = kitchenController;
