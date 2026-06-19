const { Order, OrderItem, MenuItem, Table } = require("../models");
const { Op } = require("sequelize");
const { activeOrderStatusWhere } = require("../utils/orderStatus");

async function findActiveOrderByUser(userId) {
  const orders = await Order.findAll({
    where: {
      user_id: userId,
      status: activeOrderStatusWhere(),
    },
    include: [
      {
        model: Table,
        required: false,
        attributes: ["table_id", "status", "table_number", "capacity"],
      },
      {
        model: OrderItem,
        required: false,
        include: [
          {
            model: MenuItem,
            attributes: ["item_id", "name", "price"],
          },
        ],
      },
    ],
    order: [["arrival_time", "DESC"]],
  });

  if (!orders.length) return null;

  const serving = orders.find((o) => o.Table && o.Table.status && o.Table.status !== "available");
  if (serving) return serving;

  return orders[0];
}

async function findActiveOrderByTable(tableId) {
  const orders = await Order.findAll({
    where: {
      table_id: tableId,
      status: activeOrderStatusWhere(),
    },
    include: [
      {
        model: OrderItem,
        required: false,
        include: [{ model: MenuItem, attributes: ["item_id", "name", "price"] }],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  if (!orders.length) return null;

  const orderWithItems = orders.find((order) => (order.OrderItems || []).length > 0);
  return orderWithItems || orders[0];
}

async function computeItemsTotal(orderItems) {
  const aggregated = {};
  let totalAmount = 0;

  (orderItems || []).forEach((oi) => {
    const menu = oi.MenuItem;
    if (!menu) return;
    const key = menu.item_id;
    const unitPrice = Number(oi.price ?? menu.price) || 0;
    if (!aggregated[key]) {
      aggregated[key] = {
        item_id: menu.item_id,
        name: menu.name,
        unit_price: unitPrice,
        quantity: 0,
      };
    }
    aggregated[key].quantity += oi.quantity || 0;
  });

  const items = Object.values(aggregated).map((it) => {
    const lineTotal = it.unit_price * it.quantity;
    totalAmount += lineTotal;
    return {
      item_id: it.item_id,
      name: it.name,
      unit_price: it.unit_price,
      quantity: it.quantity,
      line_total: lineTotal,
    };
  });

  return { items, totalAmount };
}

async function buildBill({ order, tableId }) {
  if (!order && !tableId) return null;

  let sessionOrder = order;
  if (!sessionOrder && tableId) {
    sessionOrder = await findActiveOrderByTable(tableId);
  }
  if (!sessionOrder) return null;

  const table_id = tableId || sessionOrder.table_id;
  if (!table_id) return null;

  const table = await Table.findByPk(table_id);
  if (!table) return null;

  if (table.status === "available" && !order) {
    return null;
  }

  if (!sessionOrder.OrderItems) {
    sessionOrder = await Order.findByPk(sessionOrder.order_id, {
      include: [
        {
          model: OrderItem,
          required: false,
          include: [{ model: MenuItem, attributes: ["item_id", "name", "price"] }],
        },
      ],
    });
  }

  const { items, totalAmount } = await computeItemsTotal(sessionOrder.OrderItems);

  if (Number(sessionOrder.total_amount) !== totalAmount) {
    await sessionOrder.update({ total_amount: totalAmount });
  }

  return {
    table: {
      table_id: table.table_id,
      table_number: table.table_number,
      capacity: table.capacity,
      status: table.status,
    },
    order: {
      order_id: sessionOrder.order_id,
      arrival_time: sessionOrder.arrival_time,
      number_of_guests: sessionOrder.number_of_guests,
      status: sessionOrder.status,
      order_type: sessionOrder.order_type,
      payment_status: sessionOrder.payment_status,
    },
    reservation: {
      reservation_id: sessionOrder.order_id,
      reservation_time: sessionOrder.arrival_time,
      number_of_guests: sessionOrder.number_of_guests,
      status: sessionOrder.status,
    },
    items,
    total_amount: totalAmount,
  };
}

async function getBillForUser(userId) {
  const order = await findActiveOrderByUser(userId);
  if (!order) return null;
  return buildBill({ order, tableId: null });
}

async function getBillByTable(tableId) {
  return buildBill({ order: null, tableId });
}

module.exports = {
  getBillForUser,
  getBillByTable,
  findActiveOrderByTable,
  findActiveOrderByUser,
};
