/**
 * SERVICE PHỤC VỤ (WAITER) — gọi món tại bàn, đánh dấu đã bưng, cập nhật trạng thái bàn.
 * Ctrl+F: gọi món, phục vụ, served, waiter createOrder
 * Luồng demo: Phần 3 — Bước 3.3 (gọi món), 3.5 (đánh dấu served)
 * API: POST /api/admin/waiter/orders, PATCH .../serve
 */
const { Order, OrderItem, Table, MenuItem, OrderTable, User, Employee, sequelize } = require('../../models');

const { Op } = require('sequelize');

const {

  TABLE_STATUS,

  isValidTableStatus,

  shouldEndTableSession,

  normalizeTableStatus,

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
  async findOrCreateSessionOrder({ table_id, branch_id, user_id, assigned_waiter_id, transaction }) {

    // Nếu bàn đã có phiên đang phục vụ thì dùng lại (gọi thêm món vào đúng order đó).
    const existing = await findActiveOrderByTableId(table_id, { transaction });

    if (existing) {
      const updates = {};
      if (assigned_waiter_id && !existing.assigned_waiter_id) {
        updates.assigned_waiter_id = assigned_waiter_id;
      }
      if (!existing.checked_in_at) {
        updates.checked_in_at = new Date();
      }
      if (Object.keys(updates).length) {
        await existing.update(updates, { transaction });
      }
      return existing;
    }

    // Chưa có phiên → tạo order walk_in mới (khách ngồi rồi mới gọi món).
    const now = new Date();

    return Order.create(

      {

        table_id,

        branch_id,

        user_id: user_id || null,

        assigned_waiter_id: assigned_waiter_id || null,

        status: ORDER_STATUS.PRE_ORDERED,

        order_type: 'walk_in',

        payment_status: 'unpaid',

        arrival_time: now,

        checked_in_at: now,

        number_of_guests: 1,

        created_at: now,

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

      // Lấy bàn để biết chi nhánh; không có bàn thì lỗi.
      const table = await Table.findByPk(table_id, {

        attributes: ['table_id', 'branch_id'],

        transaction: t,

      });

      if (!table) throw new Error('Table not found');



      // Dựng payload món (chốt giá + status pending cho bếp).
      const orderItemsPayload = await buildOrderItemPayloads(items, t);



      // Tìm phiên đang phục vụ hoặc tạo mới để gắn món.
      const order = await this.findOrCreateSessionOrder({

        table_id,

        branch_id: table.branch_id,

        user_id: createdBy,

        assigned_waiter_id: createdBy,

        transaction: t,

      });



      if (orderNote && !order.note) {

        await order.update({ note: orderNote }, { transaction: t });

      }

      // Gán waiter phụ trách nếu chưa có (dùng nhân viên đang thao tác).
      if (createdBy && !order.assigned_waiter_id) {
        await order.update({ assigned_waiter_id: createdBy }, { transaction: t });
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



      // Có món tại bàn → chắc chắn bàn đang được phục vụ (occupied).
      await Table.update(

        { status: TABLE_STATUS.OCCUPIED },

        { where: { table_id }, transaction: t }

      );



      // Nếu order còn ở giai đoạn trước → nâng lên "đang phục vụ" cho khớp thực tế.
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
          model: User,
          as: 'AssignedWaiter',
          required: false,
          attributes: ['user_id', 'full_name', 'phone'],
        },
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
   * [PHỤC VỤ] Gán hoặc đổi nhân viên phụ trách phiên bàn.
   * Ctrl+F: assignWaiterToOrder, gán phục vụ
   */
  async assignWaiterToOrder(orderId, waiterUserId, branchId) {
    const order = await Order.findOne({
      where: { order_id: orderId, branch_id: branchId },
    });
    if (!order) {
      const err = new Error('Không tìm thấy phiên phục vụ');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const waiter = await User.findOne({
      where: {
        user_id: waiterUserId,
        branch_id: branchId,
        role: { [Op.in]: ['waiter', 'admin'] },
        is_active: true,
      },
    });

    if (!waiter) {
      const err = new Error('Nhân viên phục vụ không hợp lệ hoặc không thuộc chi nhánh');
      err.code = 'INVALID_WAITER';
      throw err;
    }

    await order.update({ assigned_waiter_id: waiterUserId });

    const reloaded = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'AssignedWaiter',
          attributes: ['user_id', 'full_name', 'phone'],
        },
        { model: Table, attributes: ['table_id', 'table_number'] },
      ],
    });

    return reloaded;
  },

  /**
   * [PHỤC VỤ] Gán nhân viên theo bàn — tạo phiên nếu chưa có (khi chỉ đổi trạng thái bàn).
   * Ctrl+F: assignWaiterToTable
   */
  async assignWaiterToTable(tableId, waiterUserId, branchId) {
    const table = await Table.findOne({
      where: { table_id: tableId, branch_id: branchId },
    });
    if (!table) {
      const err = new Error('Không tìm thấy bàn');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const waiter = await User.findOne({
      where: {
        user_id: waiterUserId,
        branch_id: branchId,
        role: { [Op.in]: ['waiter', 'admin'] },
        is_active: true,
      },
    });
    if (!waiter) {
      const err = new Error('Nhân viên phục vụ không hợp lệ hoặc không thuộc chi nhánh');
      err.code = 'INVALID_WAITER';
      throw err;
    }

    const order = await this.findOrCreateSessionOrder({
      table_id: tableId,
      branch_id: branchId,
      assigned_waiter_id: waiterUserId,
    });

    if (order.assigned_waiter_id !== waiterUserId) {
      await order.update({ assigned_waiter_id: waiterUserId });
    }

    const servingStatus = normalizeTableStatus(table.status);
    if (servingStatus === TABLE_STATUS.AVAILABLE || servingStatus === TABLE_STATUS.CLEANING) {
      await table.update({ status: TABLE_STATUS.OCCUPIED });
    }

    return Order.findByPk(order.order_id, {
      include: [
        {
          model: User,
          as: 'AssignedWaiter',
          attributes: ['user_id', 'full_name', 'phone'],
        },
        { model: Table, attributes: ['table_id', 'table_number'] },
      ],
    });
  },

  /** Danh sách waiter active của chi nhánh (dropdown gán bàn). */
  async listBranchWaiters(branchId) {
    const rows = await Employee.findAll({
      where: {
        branch_id: branchId,
        status: 'active',
        position: { [Op.in]: ['waiter', 'cashier'] },
      },
      include: [
        {
          model: User,
          attributes: ['user_id', 'full_name', 'phone', 'role'],
          where: { role: { [Op.in]: ['waiter', 'admin'] }, is_active: true },
        },
      ],
      order: [['employee_id', 'ASC']],
    });

    return rows.map((row) => {
      const data = row.toJSON();
      return {
        user_id: data.User?.user_id,
        full_name: data.User?.full_name,
        phone: data.User?.phone,
        employee_id: data.employee_id,
      };
    }).filter((w) => w.user_id);
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
  async updateTableStatus(table_id, status, staffUserId = null) {

    if (!isValidTableStatus(status)) {

      throw new Error('Trạng thái bàn không hợp lệ');

    }

    const table = await Table.findByPk(table_id);
    if (!table) throw new Error('Không tìm thấy bàn');

    await Table.update({ status }, { where: { table_id } });

    const normalized = normalizeTableStatus(status);
    const isServing =
      normalized === TABLE_STATUS.OCCUPIED || normalized === TABLE_STATUS.PRE_ORDERED;

    // Khi chuyển sang đang phục vụ: tạo/tìm phiên order và gán waiter đang thao tác.
    if (isServing && staffUserId) {
      await this.findOrCreateSessionOrder({
        table_id,
        branch_id: table.branch_id,
        assigned_waiter_id: staffUserId,
      });
    }

    // Nếu chuyển về trạng thái kết thúc phiên (available/cleaning) → đóng các order chưa kết thúc của bàn.
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

