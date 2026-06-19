const { Order, OrderItem, Table, MenuItem, sequelize } = require('../../models');

const { Op } = require('sequelize');

const {

  TABLE_STATUS,

  isValidTableStatus,

  shouldEndTableSession,

} = require('../../utils/tableStatus');

const { ORDER_STATUS, notTerminalOrderStatusWhere } = require('../../utils/orderStatus');

const { ORDER_ITEM_STATUS } = require('../../utils/orderItemStatus');

const { ACTIVE_SESSION_STATUSES } = require('../../utils/reservationStatus');

const { buildActiveOrdersByTableWhere } = require('../../utils/orderQueries');

const { buildOrderItemPayloads } = require('../../utils/orderItemFactory');



const waiterService = {

  async findOrCreateSessionOrder({ table_id, branch_id, user_id, transaction }) {

    const existing = await Order.findOne({

      where: {

        table_id,

        status: { [Op.in]: ACTIVE_SESSION_STATUSES },

      },

      order: [['created_at', 'DESC']],

      transaction,

    });

    if (existing) return existing;



    return Order.create(

      {

        table_id,

        branch_id,

        user_id: user_id || null,

        status: ORDER_STATUS.PRE_ORDERED,

        order_type: 'walk_in',

        payment_status: 'unpaid',

        arrival_time: new Date(),

        number_of_guests: 1,

      },

      { transaction }

    );

  },



  async createOrder({ table_id, items = [], note = null, createdBy = null }) {

    const orderNote =

      note != null && String(note).trim() ? String(note).trim().slice(0, 200) : null;



    return sequelize.transaction(async (t) => {

      const table = await Table.findByPk(table_id, {

        attributes: ['table_id', 'branch_id'],

        transaction: t,

      });

      if (!table) throw new Error('Table not found');



      const orderItemsPayload = await buildOrderItemPayloads(items, t);



      const order = await this.findOrCreateSessionOrder({

        table_id,

        branch_id: table.branch_id,

        user_id: createdBy,

        transaction: t,

      });



      if (orderNote && !order.note) {

        await order.update({ note: orderNote }, { transaction: t });

      }



      const orderItems = await Promise.all(

        orderItemsPayload.map((payload) =>

          OrderItem.create(

            {

              order_id: order.order_id,

              ...payload,

            },

            { transaction: t }

          )

        )

      );



      await Table.update(

        { status: TABLE_STATUS.OCCUPIED },

        { where: { table_id }, transaction: t }

      );



      if ([ORDER_STATUS.CONFIRMED, ORDER_STATUS.PRE_ORDERED].includes(order.status)) {

        await order.update({ status: ORDER_STATUS.IN_PROGRESS }, { transaction: t });

      }



      return { order, orderItems };

    });

  },



  async getOrdersByTable(table_id) {

    return Order.findAll({

      where: buildActiveOrdersByTableWhere(table_id),

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

        {

          where: {

            table_id,

            status: notTerminalOrderStatusWhere(),

          },

        }

      );

    }



    return Table.findByPk(table_id);

  },

};



module.exports = waiterService;

