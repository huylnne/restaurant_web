const { Order, OrderItem, Table, MenuItem, sequelize } = require('../../models');

const waiterService = {
  // Tạo order mới (items = [{ item_id, quantity }])
  async createOrder({ table_id, items = [], createdBy = null }) {
    return sequelize.transaction(async (t) => {
      const order = await Order.create(
        {
          table_id,
          status: 'PENDING',
          created_by: createdBy,
        },
        { transaction: t }
      );

      const orderItems = await Promise.all(
        items.map((it) =>
          OrderItem.create(
            {
              order_id: order.order_id,
              item_id: it.item_id,
              quantity: it.quantity || 1,
              status: 'pending',
            },
            { transaction: t }
          )
        )
      );

      // cập nhật trạng thái bàn sang occupied
      await Table.update({ status: 'occupied' }, { where: { table_id }, transaction: t });

      return { order, orderItems };
    });
  },

  // Lấy orders theo bàn (kèm order items)
  async getOrdersByTable(table_id) {
    return Order.findAll({
      where: { table_id },
      include: [
        {
          model: OrderItem,
          include: [{ model: MenuItem }],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  },

  // Đánh dấu 1 order_item là served
  async markItemServed(orderItemId) {
    const item = await OrderItem.findByPk(orderItemId);
    if (!item) throw new Error('OrderItem not found');
    item.status = 'served';
    await item.save();
    return item;
  },

  // Cập nhật trạng thái bàn
  async updateTableStatus(table_id, status) {
    await Table.update({ status }, { where: { table_id } });
    return Table.findByPk(table_id);
  },
};

module.exports = waiterService;