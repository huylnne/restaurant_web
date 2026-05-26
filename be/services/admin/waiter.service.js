const { Order, OrderItem, Table, MenuItem, Reservation, sequelize } = require('../../models');
const { Op } = require('sequelize');
const {
  TABLE_STATUS,
  isValidTableStatus,
  shouldEndTableSession,
} = require('../../utils/tableStatus');
const { ORDER_STATUS, notTerminalOrderStatusWhere } = require('../../utils/orderStatus');
const { ORDER_ITEM_STATUS } = require('../../utils/orderItemStatus');
const { ACTIVE_RESERVATION_STATUSES } = require('../../utils/reservationStatus');
const { buildActiveOrdersByTableWhere } = require('../../utils/orderQueries');

const waiterService = {
  async createOrder({ table_id, items = [], createdBy = null }) {
    return sequelize.transaction(async (t) => {
      const order = await Order.create(
        {
          table_id,
          status: ORDER_STATUS.OPEN,
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
              status: ORDER_ITEM_STATUS.PENDING,
            },
            { transaction: t }
          )
        )
      );

      await Table.update(
        { status: TABLE_STATUS.OCCUPIED },
        { where: { table_id }, transaction: t }
      );

      return { order, orderItems };
    });
  },

  async getOrdersByTable(table_id) {
    const activeReservations = await Reservation.findAll({
      where: {
        table_id,
        status: { [Op.in]: ACTIVE_RESERVATION_STATUSES },
      },
      attributes: ['reservation_id'],
    });
    const reservationIds = activeReservations.map((r) => r.reservation_id);

    return Order.findAll({
      where: buildActiveOrdersByTableWhere(table_id, reservationIds),
      include: [
        {
          model: OrderItem,
          include: [{ model: MenuItem }],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  },

  async markItemServed(orderItemId) {
    const item = await OrderItem.findByPk(orderItemId);
    if (!item) throw new Error('OrderItem not found');
    item.status = ORDER_ITEM_STATUS.SERVED;
    await item.save();
    return item;
  },

  async updateTableStatus(table_id, status) {
    if (!isValidTableStatus(status)) {
      throw new Error('Trạng thái bàn không hợp lệ');
    }

    await Table.update({ status }, { where: { table_id } });

    if (shouldEndTableSession(status)) {
      await Order.update(
        { status: ORDER_STATUS.COMPLETED },
        { where: { table_id, status: notTerminalOrderStatusWhere() } }
      );

      const reservations = await Reservation.findAll({
        where: {
          table_id,
          status: { [Op.notIn]: ['completed', 'cancelled'] },
        },
        attributes: ['reservation_id'],
      });
      const reservationIds = reservations.map((r) => r.reservation_id);

      if (reservationIds.length > 0) {
        await Order.update(
          { status: ORDER_STATUS.COMPLETED },
          {
            where: {
              reservation_id: { [Op.in]: reservationIds },
              status: notTerminalOrderStatusWhere(),
            },
          }
        );
      }

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
