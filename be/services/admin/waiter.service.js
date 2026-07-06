/**
 * SERVICE PHỤC VỤ (WAITER) — gọi món tại bàn, đánh dấu đã bưng, cập nhật trạng thái bàn.
 * Ctrl+F: gọi món, phục vụ, served, waiter createOrder
 * Luồng demo: Phần 3 — Bước 3.3 (gọi món), 3.5 (đánh dấu served)
 * API: POST /api/admin/waiter/orders, PATCH .../serve
 */
const { Order, OrderItem, Table, MenuItem, OrderTable, sequelize } = require('../../models');

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
const { findActiveOrderByTableId } = require('../../utils/orderTableLinks');



const waiterService = {

  /**
   * [PHỤC VỤ] Tìm order đang active trên bàn hoặc tạo phiên walk_in mới khi gọi món.
   * Ctrl+F: findOrCreateSessionOrder, phiên bàn
   */
  async findOrCreateSessionOrder({ table_id, branch_id, user_id, transaction }) {

    const existing = await findActiveOrderByTableId(table_id, { transaction });

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



  /**
   * [GỌI MÓN] Phục vụ thêm món vào bàn — tạo OrderItem, đẩy bếp (status in_progress).
   * Luồng demo: Phần 3 — Bước 3.3. Ctrl+F: waiter createOrder, gọi món phục vụ
   */
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



  /**
   * [PHỤC VỤ] Lấy order + danh sách món của bàn (dialog chi tiết bàn trên /admin/tables).
   * Ctrl+F: getOrdersByTable, order theo bàn
   */
  async getOrdersByTable(table_id) {
    const active = await findActiveOrderByTableId(table_id, {
      itemInclude: {
        model: OrderItem,
        include: [{ model: MenuItem }],
      },
    });
    if (!active) return [];

    const order = await Order.findByPk(active.order_id, {
      include: [
        {
          model: OrderItem,
          include: [{ model: MenuItem }],
        },
        { model: Table, attributes: ['table_id', 'table_number'] },
        {
          model: OrderTable,
          attributes: ['table_id', 'is_primary'],
          required: false,
          include: [{ model: Table, attributes: ['table_id', 'table_number'] }],
        },
      ],
    });
    return order ? [order] : [];
  },



  /**
   * [PHỤC VỤ] Đánh dấu món đã bưng ra (served) — sau khi bếp hoàn thành.
   * Luồng demo: Phần 3 — Bước 3.5. Ctrl+F: markItemServed, đã phục vụ, served
   */
  async markItemServed(orderItemId) {

    const item = await OrderItem.findByPk(orderItemId);

    if (!item) throw new Error('OrderItem not found');

    item.status = ORDER_ITEM_STATUS.SERVED;

    await item.save();

    return item;

  },



  /**
   * [QUẢN LÝ BÀN] Đổi trạng thái bàn (trống/chờ dọn/...) — nếu kết thúc phiên thì complete order.
   * Ctrl+F: updateTableStatus, chờ dọn, cleaning
   */
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

