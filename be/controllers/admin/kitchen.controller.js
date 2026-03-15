const kitchenService = require('../../services/admin/kitchen.service');

const kitchenController = {
  // GET /api/admin/kitchen/order-items?status=pending
  async listOrderItems(req, res) {
    try {
      const status = req.query.status || 'pending';
      const items = await kitchenService.getOrderItemsByStatus(status);
      return res.json(items);
    } catch (err) {
      console.error('kitchen.listOrderItems', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },

  // PATCH /api/admin/kitchen/order-items/:id/status
  async changeOrderItemStatus(req, res) {
    try {
      const id = req.params.id;
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'status is required' });

      const updated = await kitchenService.updateOrderItemStatus(id, status);
      return res.json(updated);
    } catch (err) {
      console.error('kitchen.changeOrderItemStatus', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },
};

module.exports = kitchenController;