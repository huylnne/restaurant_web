const { Order, OrderItem, Table, MenuItem, Reservation, sequelize } = require('../../models');
const { Op } = require('sequelize');

const waiterService = {
  // Tạo order mới (items = [{ item_id, quantity }])
  async createOrder({ table_id, items = [], createdBy = null }) {
    return sequelize.transaction(async (t) => {
      const order = await Order.create(
        {
          table_id,
          status: 'PENDING',
          user_id: createdBy,
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

  // Lấy orders ĐANG HOẠT ĐỘNG theo bàn (kèm order items)
  // Chỉ lấy đơn chưa hoàn thành/hủy để tránh hiện data cũ khi bàn đã trống
  async getOrdersByTable(table_id) {
    const ACTIVE_ORDER_STATUSES = ['PENDING', 'IN_PROGRESS', 'pre-ordered'];

    const activeReservations = await Reservation.findAll({
      where: {
        table_id,
        status: ['confirmed', 'pre-ordered', 'waiting_payment'],
      },
      attributes: ['reservation_id'],
    });
    const reservationIds = activeReservations.map((r) => r.reservation_id);

    const whereClause = {
      status: { [Op.in]: ACTIVE_ORDER_STATUSES },
      ...(reservationIds.length > 0
        ? { [Op.or]: [{ table_id }, { reservation_id: { [Op.in]: reservationIds } }] }
        : { table_id }),
    };

    return Order.findAll({
      where: whereClause,
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

  // Cập nhật trạng thái bàn (waiter chọn "Trống" = đã thanh toán xong → clear dữ liệu phiên)
  async updateTableStatus(table_id, status) {
    await Table.update({ status }, { where: { table_id } });

    if (status === 'available') {
      // 1. Hoàn tất tất cả đơn gắn trực tiếp với bàn
      await Order.update(
        { status: 'COMPLETED' },
        { where: { table_id, status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] } } }
      );

      // 2. Lấy mọi reservation của bàn (kể cả pre-ordered, confirmed, waiting_payment)
      const reservations = await Reservation.findAll({
        where: {
          table_id,
          status: { [Op.notIn]: ['completed', 'cancelled'] },
        },
        attributes: ['reservation_id'],
      });
      const reservationIds = reservations.map((r) => r.reservation_id);

      // 3. Hoàn tất đơn gắn với reservation
      if (reservationIds.length > 0) {
        await Order.update(
          { status: 'COMPLETED' },
          {
            where: {
              reservation_id: { [Op.in]: reservationIds },
              status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] },
            },
          }
        );
      }

      // 4. Đóng tất cả reservation active của bàn
      await Reservation.update(
        { status: 'completed' },
        {
          where: {
            table_id,
            status: { [Op.notIn]: ['completed', 'cancelled'] },
          },
        }
      );
    }

    return Table.findByPk(table_id);
  },
};

module.exports = waiterService;