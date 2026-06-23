const { Order, OrderItem, MenuItem, Table } = require("../models");
const { Op } = require("sequelize");
const { activeOrderStatusWhere } = require("../utils/orderStatus");
const { resolveMenuItemUnitPrice } = require("../utils/menuItemPrice");
const {
  findActiveOrderByTableId,
  getTablesForOrder,
  orderHasMultipleTables,
} = require("../utils/orderTableLinks");

const orderItemInclude = {
  model: OrderItem,
  required: false,
  include: [{ model: MenuItem, attributes: ["item_id", "name", "price", "sale_price"] }],
};

async function resolvePrimaryBillingOrder(orderOrId) {
  const order =
    typeof orderOrId === "object" && orderOrId?.order_id
      ? orderOrId
      : await Order.findByPk(orderOrId, {
          attributes: ["order_id", "table_id", "booking_group_id"],
        });
  if (!order) return null;
  if (!order.booking_group_id) return order;

  const groupOrders = await findGroupSessionOrders(order);
  return groupOrders[0] || order;
}

async function findGroupSessionOrders(sessionOrder) {
  const groupId = sessionOrder?.booking_group_id;
  if (!groupId) return [sessionOrder];

  const groupOrders = await Order.findAll({
    where: {
      booking_group_id: groupId,
      status: activeOrderStatusWhere(),
    },
    include: [orderItemInclude],
    order: [["order_id", "ASC"]],
  });

  return groupOrders.length ? groupOrders : [sessionOrder];
}

function collectOrderItems(orders) {
  return (orders || []).flatMap((o) => o.OrderItems || []);
}

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
      orderItemInclude,
    ],
    order: [["arrival_time", "DESC"]],
  });

  if (!orders.length) return null;

  const serving = orders.find((o) => o.Table && o.Table.status && o.Table.status !== "available");
  if (serving) return serving;

  return orders[0];
}

async function findActiveOrderByTable(tableId) {
  return findActiveOrderByTableId(tableId, { itemInclude: orderItemInclude });
}

async function computeItemsTotal(orderItems) {
  const aggregated = {};
  let totalAmount = 0;
  let subtotalBeforeDiscount = 0;
  let discountTotal = 0;

  (orderItems || []).forEach((oi) => {
    const menu = oi.MenuItem;
    if (!menu) return;

    const listPrice = Number(menu.price) || 0;
    const saleUnitPrice = resolveMenuItemUnitPrice(menu);
    const storedPrice =
      oi.price != null && oi.price !== "" ? Number(oi.price) : null;

    let unitPrice;
    if (storedPrice != null && storedPrice > 0) {
      unitPrice =
        listPrice > 0 && storedPrice >= listPrice && saleUnitPrice < listPrice
          ? saleUnitPrice
          : storedPrice;
    } else {
      unitPrice = saleUnitPrice;
    }

    const originalUnitPrice = listPrice || unitPrice;
    const key = `${menu.item_id}:${unitPrice}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        item_id: menu.item_id,
        name: menu.name,
        unit_price: unitPrice,
        original_unit_price: originalUnitPrice,
        quantity: 0,
      };
    }
    aggregated[key].quantity += oi.quantity || 0;
  });

  const items = Object.values(aggregated).map((it) => {
    const quantity = it.quantity;
    const lineTotal = it.unit_price * quantity;
    const lineOriginalTotal = it.original_unit_price * quantity;
    const lineDiscount =
      it.original_unit_price > it.unit_price ? lineOriginalTotal - lineTotal : 0;

    totalAmount += lineTotal;
    subtotalBeforeDiscount += lineOriginalTotal;
    discountTotal += lineDiscount;

    return {
      item_id: it.item_id,
      name: it.name,
      unit_price: it.unit_price,
      original_unit_price: it.original_unit_price,
      quantity,
      line_total: lineTotal,
      line_discount: lineDiscount,
      has_discount: lineDiscount > 0,
    };
  });

  return {
    items,
    totalAmount,
    subtotalBeforeDiscount,
    discountTotal,
  };
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
      include: [orderItemInclude],
    });
  }

  const groupOrders = await findGroupSessionOrders(sessionOrder);
  const primaryOrder = groupOrders[0] || sessionOrder;
  const linkedTables = await getTablesForOrder(primaryOrder.order_id);
  const groupTables =
    linkedTables.length > 1
      ? linkedTables
      : groupOrders.length > 1
        ? await Table.findAll({
            where: {
              table_id: {
                [Op.in]: [...new Set(groupOrders.map((o) => o.table_id).filter(Boolean))],
              },
            },
            attributes: ["table_id", "table_number", "capacity", "status"],
            order: [["table_number", "ASC"]],
          })
        : linkedTables.length
          ? linkedTables
          : [table];

  const allItems =
    groupOrders.length > 1 ? collectOrderItems(groupOrders) : sessionOrder.OrderItems || [];
  const { items, totalAmount, subtotalBeforeDiscount, discountTotal } =
    await computeItemsTotal(allItems);

  const ordersToSync = groupOrders.length > 1 ? groupOrders : [sessionOrder];
  for (const groupOrder of ordersToSync) {
    if (Number(groupOrder.total_amount) !== totalAmount) {
      await groupOrder.update({ total_amount: totalAmount });
    }
  }

  const multiTable =
    groupOrders.length > 1 || (await orderHasMultipleTables(primaryOrder.order_id));

  return {
    table: {
      table_id: table.table_id,
      table_number: table.table_number,
      capacity: table.capacity,
      status: table.status,
    },
    tables: groupTables.map((t) => ({
      table_id: t.table_id,
      table_number: t.table_number,
      capacity: t.capacity,
      status: t.status,
    })),
    booking_group_id: primaryOrder.booking_group_id || null,
    multiTable,
    order: {
      order_id: primaryOrder.order_id,
      arrival_time: primaryOrder.arrival_time,
      number_of_guests: primaryOrder.number_of_guests,
      status: primaryOrder.status,
      order_type: primaryOrder.order_type,
      payment_status: primaryOrder.payment_status,
    },
    reservation: {
      reservation_id: primaryOrder.order_id,
      reservation_time: primaryOrder.arrival_time,
      number_of_guests: primaryOrder.number_of_guests,
      status: primaryOrder.status,
    },
    items,
    subtotal_before_discount: subtotalBeforeDiscount,
    discount_total: discountTotal,
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
  findGroupSessionOrders,
  resolvePrimaryBillingOrder,
  computeItemsTotal,
};
