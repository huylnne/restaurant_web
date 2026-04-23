const { OrderItem, MenuItem, Order, Table, Reservation } = require('../../models');

const kitchenService = {
  // Lấy danh sách order items theo trạng thái (pending, processing, done)
  async getOrderItemsByStatus(status = 'pending') {
    const items = await OrderItem.findAll({
      where: { status },
      include: [
        {
          model: MenuItem,
          attributes: ['item_id', 'name', 'price', 'category'],
        },
        {
          model: Order,
          attributes: ['order_id', 'table_id', 'reservation_id'],
          include: [
            {
              model: Table,
              attributes: ['table_id', 'table_number'],
            },
            {
              model: Reservation,
              attributes: ['reservation_id', 'table_id'],
              include: [
                {
                  model: Table,
                  attributes: ['table_id', 'table_number'],
                },
              ],
            },
          ],
        },
      ],
      order: [['order_item_id', 'ASC']],
    });

    // Chuẩn hoá thông tin bàn để kitchen/waiter đọc nhanh.
    return items.map((item) => {
      const plain = item.toJSON();
      const directTable = plain.Order?.Table;
      const reservationTable = plain.Order?.Reservation?.Table;
      const resolvedTable = directTable || reservationTable || null;

      return {
        ...plain,
        table_id: resolvedTable?.table_id ?? plain.Order?.table_id ?? plain.Order?.Reservation?.table_id ?? null,
        table_number: resolvedTable?.table_number ?? null,
      };
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