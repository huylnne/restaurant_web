const { Reservation, Order, OrderItem, MenuItem, Table } = require("../models");
const { Op } = require("sequelize");

const ACTIVE_RESERVATION_STATUSES = ["confirmed", "pre-ordered", "waiting_payment"];

async function findActiveReservationByUser(userId) {
  return Reservation.findOne({
    where: {
      user_id: userId,
      status: ACTIVE_RESERVATION_STATUSES,
    },
    order: [["reservation_time", "DESC"]],
  });
}

async function findActiveReservationByTable(tableId) {
  return Reservation.findOne({
    where: {
      table_id: tableId,
      status: ACTIVE_RESERVATION_STATUSES,
    },
    order: [["reservation_time", "DESC"]],
  });
}

async function buildBill({ reservation, tableId }) {
  if (!reservation && !tableId) return null;

  const table_id = tableId || reservation.table_id;
  if (!table_id) return null;

  const table = await Table.findByPk(table_id);
  if (!table) return null;

  // Cho phép build bill khi table còn 'available' nhưng có reservation tương lai
  // (bàn chưa đổi sang pre-ordered vì chưa tới 15 phút trước giờ đặt).
  // Chỉ block khi không có reservation nào được truyền vào VÀ bàn trống.
  if (table.status === "available" && !reservation) {
    return null;
  }

  const whereOrders = [];
  if (reservation) {
    whereOrders.push({ reservation_id: reservation.reservation_id });
  }
  whereOrders.push({ table_id });

  // Chỉ lấy đơn của PHIÊN HIỆN TẠI (loại trừ COMPLETED / CANCELLED)
  const orders = await Order.findAll({
    where: {
      [Op.or]: whereOrders,
      status: { [Op.notIn]: ["COMPLETED", "CANCELLED"] },
    },
    include: [
      {
        model: OrderItem,
        as: "OrderItems",
        required: false,
        include: [
          {
            model: MenuItem,
            as: "MenuItem",
            attributes: ["item_id", "name", "price"],
          },
        ],
      },
    ],
    order: [["created_at", "ASC"]],
  });

  const aggregated = {};
  let totalAmount = 0;

  orders.forEach((order) => {
    (order.OrderItems || []).forEach((oi) => {
      if (!oi.MenuItem) return;
      const key = oi.MenuItem.item_id;
      if (!aggregated[key]) {
        aggregated[key] = {
          item_id: oi.MenuItem.item_id,
          name: oi.MenuItem.name,
          unit_price: Number(oi.MenuItem.price) || 0,
          quantity: 0,
        };
      }
      aggregated[key].quantity += oi.quantity || 0;
    });
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

  return {
    table: {
      table_id: table.table_id,
      table_number: table.table_number,
      capacity: table.capacity,
      status: table.status,
    },
    reservation: reservation
      ? {
          reservation_id: reservation.reservation_id,
          reservation_time: reservation.reservation_time,
          number_of_guests: reservation.number_of_guests,
          status: reservation.status,
        }
      : null,
    items,
    total_amount: totalAmount,
  };
}

async function getBillForUser(userId) {
  const reservation = await findActiveReservationByUser(userId);
  if (!reservation) return null;
  return buildBill({ reservation, tableId: null });
}

async function getBillByTable(tableId) {
  const reservation = await findActiveReservationByTable(tableId);
  return buildBill({ reservation, tableId });
}

module.exports = {
  getBillForUser,
  getBillByTable,
};

