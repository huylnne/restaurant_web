const { OrderItem, MenuItem, Sequelize } = require('../../models');
const { Op } = require('sequelize');

const kitchenService = {
  // Lấy danh sách order items theo trạng thái (pending, processing, done)
  async getOrderItemsByStatus(status = 'pending') {
    return OrderItem.findAll({
      where: { status },
      include: [
        {
          model: MenuItem,
          attributes: ['item_id', 'name', 'price', 'category'],
        },
      ],
      order: [['order_item_id', 'ASC']],
    });
  },

  // Cập nhật trạng thái 1 order_item
  async updateOrderItemStatus(orderItemId, newStatus) {
    const item = await OrderItem.findByPk(orderItemId);
    if (!item) throw new Error('OrderItem not found');
    item.status = newStatus;
    await item.save();
    return item;
  },

  // Lấy các order_items mới (có thể theo branch nếu cần -> add condition)
  async getNewItems(limit = 100) {
    return this.getOrderItemsByStatus('pending').then((res) => res.slice(0, limit));
  },
};

module.exports = kitchenService;