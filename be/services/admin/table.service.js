const {
  Table,
  Order,
  User,
  OrderItem,
  MenuItem,
  OrderTable,
} = require("../../models");
const { Sequelize } = require("sequelize");
const tableSummaryService = require("./tableSummary.service");
const crypto = require("crypto");
const {
  TABLE_STATUS,
  isValidTableStatus,
  shouldEndTableSession,
  normalizeTableStatus,
} = require("../../utils/tableStatus");
const {
  ORDER_STATUS,
  notTerminalOrderStatusWhere,
  completedOrderStatusSqlIn,
} = require("../../utils/orderStatus");
const { orderItemLineRevenueSumExpr } = require("../../utils/revenueSql");
const { TABLE_CAPACITY } = require("../../config/restaurantRules");

const lineRevenueSum = orderItemLineRevenueSumExpr();

const DEFAULT_BRANCH_ID = tableSummaryService.DEFAULT_BRANCH_ID;
const UPCOMING_RESERVATION_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PRE_ORDERED,
];

const tableService = {
  async ensureQrToken(table) {
    if (table.qr_token) return table.qr_token;
    for (let i = 0; i < 5; i++) {
      const token = crypto.randomBytes(16).toString("hex");
      const exists = await Table.findOne({ where: { qr_token: token }, attributes: ["table_id"] });
      if (!exists) {
        await table.update({ qr_token: token });
        return token;
      }
    }
    throw new Error("Không thể sinh QR token cho bàn");
  },

  async getTables(branchId = DEFAULT_BRANCH_ID) {
    await tableSummaryService.expireReservationsForBranch(branchId);

    const ACTIVE_ORDER_STATUSES = notTerminalOrderStatusWhere();

    const tables = await Table.findAll({
      where: { branch_id: branchId },
      include: [
        {
          model: Order,
          as: "TableOrders",
          required: false,
          where: { status: ACTIVE_ORDER_STATUSES },
          include: [
            {
              model: User,
              required: false,
              attributes: ["user_id", "full_name", "phone"],
            },
            {
              model: OrderItem,
              required: false,
              include: [
                {
                  model: MenuItem,
                  required: false,
                  attributes: ["price"],
                },
              ],
            },
          ],
        },
      ],
      order: [["table_number", "ASC"]],
    });

    await Promise.all(
      tables
        .filter((t) => !t.qr_token)
        .map((t) => this.ensureQrToken(t).catch(() => null))
    );

    const linkedRows = await OrderTable.findAll({
      include: [
        {
          model: Order,
          required: true,
          where: { branch_id: branchId, status: ACTIVE_ORDER_STATUSES },
          include: [
            {
              model: User,
              required: false,
              attributes: ["user_id", "full_name", "phone"],
            },
            {
              model: OrderItem,
              required: false,
              include: [
                {
                  model: MenuItem,
                  required: false,
                  attributes: ["price"],
                },
              ],
            },
          ],
        },
      ],
    });

    const linkedOrdersByTable = new Map();
    for (const link of linkedRows) {
      const orderJson = link.Order?.toJSON?.() ?? link.Order;
      if (!orderJson) continue;
      const tid = link.table_id;
      if (!linkedOrdersByTable.has(tid)) linkedOrdersByTable.set(tid, []);
      const list = linkedOrdersByTable.get(tid);
      if (!list.some((o) => o.order_id === orderJson.order_id)) {
        list.push(orderJson);
      }
    }

    return tables.map((table) => {
      const tableData = table.toJSON();
      const now = new Date();
      const directOrders = tableData.TableOrders || [];
      const linkedOrders = linkedOrdersByTable.get(tableData.table_id) || [];
      const activeOrders = [...directOrders];
      for (const linked of linkedOrders) {
        if (!activeOrders.some((o) => o.order_id === linked.order_id)) {
          activeOrders.push(linked);
        }
      }

      const activeReservation =
        tableData.status !== TABLE_STATUS.AVAILABLE &&
        tableData.status !== TABLE_STATUS.CLEANING
          ? (activeOrders.find((o) => {
              const arrival = new Date(o.arrival_time || o.created_at);
              const timeDiff = (arrival - now) / (1000 * 60 * 60);
              return timeDiff >= -2 && timeDiff <= 2;
            }) ?? null)
          : null;

      const upcomingReservation =
        tableData.status === TABLE_STATUS.AVAILABLE
          ? (activeOrders.find((o) => {
              if (
                o.order_type !== "reservation" ||
                !UPCOMING_RESERVATION_STATUSES.includes(o.status)
              ) {
                return false;
              }
              const arrival = new Date(o.arrival_time || o.created_at);
              const diffHours = (arrival - now) / (1000 * 60 * 60);
              return diffHours > 0 && diffHours <= 24;
            }) ?? null)
          : null;

      let totalRevenue = 0;
      if (
        tableData.status !== TABLE_STATUS.AVAILABLE &&
        tableData.status !== TABLE_STATUS.CLEANING
      ) {
        activeOrders.forEach((order) => {
          (order.OrderItems || []).forEach((item) => {
            const price = item.MenuItem?.price ?? item.price ?? 0;
            totalRevenue += Number(price) * Number(item.quantity ?? 0);
          });
        });
      }

      const mappedActive = activeReservation
        ? {
            ...activeReservation,
            reservation_id: activeReservation.order_id,
            reservation_time: activeReservation.arrival_time,
          }
        : null;
      const mappedUpcoming = upcomingReservation
        ? {
            ...upcomingReservation,
            reservation_id: upcomingReservation.order_id,
            reservation_time: upcomingReservation.arrival_time,
          }
        : null;

      return {
        ...tableData,
        Reservations: activeOrders.map((o) => ({
          ...o,
          reservation_id: o.order_id,
          reservation_time: o.arrival_time,
        })),
        activeReservation: mappedActive,
        upcomingReservation: mappedUpcoming,
        totalRevenue,
      };
    });
  },

  async createTable(data) {
    const { table_number } = data;
    const branch_id = parseInt(data.branch_id, 10) || 1;

    const existingTable = await Table.findOne({ where: { table_number, branch_id } });
    if (existingTable) {
      throw new Error("Số bàn đã tồn tại trong chi nhánh này");
    }

    const table = await Table.create({
      table_number,
      capacity: TABLE_CAPACITY,
      status: TABLE_STATUS.AVAILABLE,
      branch_id,
    });

    await this.ensureQrToken(table);
    return table;
  },

  async updateTable(tableNumber, data) {
    const branch_id = parseInt(data.branch_id, 10) || 1;
    const table = await Table.findOne({ where: { table_number: tableNumber, branch_id } });
    if (!table) throw new Error("Không tìm thấy bàn");

    const { table_number, status } = data;

    if (status && !isValidTableStatus(status)) {
      throw new Error("Trạng thái bàn không hợp lệ");
    }

    if (table_number && table_number !== table.table_number) {
      const existingTable = await Table.findOne({ where: { table_number, branch_id } });
      if (existingTable) throw new Error("Số bàn mới đã tồn tại");
    }

    await table.update({
      table_number: table_number || table.table_number,
      capacity: TABLE_CAPACITY,
      status: status || table.status,
    });

    if (status && shouldEndTableSession(status)) {
      await Order.update(
        { status: ORDER_STATUS.COMPLETED },
        {
          where: {
            table_id: table.table_id,
            status: notTerminalOrderStatusWhere(),
          },
        }
      );
    }

    return table;
  },

  async deleteTable(tableNumber, branchId = DEFAULT_BRANCH_ID) {
    const table = await Table.findOne({ where: { table_number: tableNumber, branch_id: branchId } });
    if (!table) {
      throw new Error("Không tìm thấy bàn");
    }

    if (normalizeTableStatus(table.status) !== TABLE_STATUS.AVAILABLE) {
      throw new Error("Chỉ xóa được bàn đang trống");
    }

    await table.destroy();
    return { message: "Đã xóa bàn thành công" };
  },

  async getTableActivities(branchId = DEFAULT_BRANCH_ID) {
    const activities = await Order.findAll({
      where: { branch_id: branchId },
      limit: 10,
      order: [["created_at", "DESC"]],
      include: [
        { model: Table, required: true },
        { model: User, required: false, attributes: ["user_id", "full_name", "phone"] },
        { model: OrderItem, required: false },
      ],
    });

    return activities.map((activity) => {
      const activityData = activity.toJSON();
      const hasItems = activityData.OrderItems && activityData.OrderItems.length > 0;
      return {
        ...activityData,
        reservation_id: activityData.order_id,
        reservation_time: activityData.arrival_time,
        activityType: hasItems ? "order" : "reservation",
        timestamp: activityData.created_at,
      };
    });
  },

  async getTableSummary(branchId = DEFAULT_BRANCH_ID) {
    const summary = await tableSummaryService.getTableSummary(branchId);
    const db = require("../../models/db");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const revenueQuery = `
      SELECT ${lineRevenueSum} as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND o.created_at >= :today
        AND mi.branch_id = :branchId
    `;
    const [revenueResult] = await db.sequelize.query(revenueQuery, {
      replacements: { today, branchId },
      type: Sequelize.QueryTypes.SELECT,
    });

    return {
      totalTables: summary.totalTables,
      availableTables: summary.availableTables,
      occupiedTables: summary.servingTables,
      reservedTables: summary.reservedTables,
      cleaningTables: summary.cleaningTables,
      currentRevenue: parseFloat(revenueResult.total) || 0,
    };
  },
};

module.exports = tableService;
