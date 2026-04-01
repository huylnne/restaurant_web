const {
  Table,
  Reservation,
  Order,
  User,
  OrderItem,
  MenuItem,
} = require("../../models");
const { Sequelize, Op } = require("sequelize");
const tableSummaryService = require("./tableSummary.service");

const DEFAULT_BRANCH_ID = tableSummaryService.DEFAULT_BRANCH_ID;

const tableService = {
  // Lấy danh sách bàn (cùng branch với getTableSummary để số liệu khớp).
  // Trước khi trả về: tự chuyển bàn đặt trước quá 15 phút (khách chưa tới) thành trống.
  async getTables(branchId = DEFAULT_BRANCH_ID) {
    await tableSummaryService.expireReservationsForBranch(branchId);

    // Chỉ load reservation ĐANG HOẠT ĐỘNG để tránh join toàn bộ lịch sử
    const ACTIVE_RESERVATION_STATUSES = ["confirmed", "pre-ordered", "waiting_payment"];
    const ACTIVE_ORDER_STATUSES       = { [Op.notIn]: ["COMPLETED", "CANCELLED"] };

    const tables = await Table.findAll({
      where: { branch_id: branchId },
      include: [
        {
          model: Reservation,
          required: false,
          where: { status: { [Op.in]: ACTIVE_RESERVATION_STATUSES } },
          include: [
            {
              model: Order,
              as: "Orders",
              required: false,
              where: { status: ACTIVE_ORDER_STATUSES },
              include: [
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
            {
              model: User,
              required: false,
              attributes: ["user_id", "full_name", "phone"],
            },
          ],
        },
        // Đơn waiter tạo trực tiếp cho bàn — chỉ đơn đang hoạt động
        {
          model: Order,
          as: "TableOrders",
          required: false,
          where: { status: ACTIVE_ORDER_STATUSES },
          include: [
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

    // Tính toán thông tin bổ sung cho mỗi bàn
    return tables.map((table) => {
      const tableData = table.toJSON();
      const now = new Date();

      // Bàn đang dùng (pre-ordered / occupied) → lấy reservation trong cửa sổ ±2 giờ
      // Bàn trống → không set activeReservation (tránh lộ data cũ)
      const activeReservation =
        tableData.status !== "available"
          ? (tableData.Reservations?.find((r) => {
              const reservationTime = new Date(r.reservation_time);
              const timeDiff = (reservationTime - now) / (1000 * 60 * 60);
              return timeDiff >= -2 && timeDiff <= 2;
            }) ?? null)
          : null;

      // Bàn đang Trống nhưng có reservation tương lai (trong 24h tới) → cảnh báo cho nhân viên
      const upcomingReservation =
        tableData.status === "available"
          ? (tableData.Reservations?.find((r) => {
              if (r.status !== "confirmed") return false;
              const resTime = new Date(r.reservation_time);
              const diffHours = (resTime - now) / (1000 * 60 * 60);
              return diffHours > 0 && diffHours <= 24;
            }) ?? null)
          : null;

      // Hóa đơn tạm tính = tổng (price * quantity) của tất cả order items gắn với bàn:
      // 1) Đơn user qua reservation (order.reservation_id → reservation.table_id)
      // 2) Đơn waiter trực tiếp (order.table_id)
      let totalRevenue = 0;
      const sumOrderItems = (orders) => {
        (orders || []).forEach((order) => {
          (order.OrderItems || []).forEach((item) => {
            const price = item.MenuItem?.price ?? 0;
            const quantity = item.quantity ?? 0;
            totalRevenue += Number(price) * Number(quantity);
          });
        });
      };
      const reservations = tableData.Reservations || [];
      reservations.forEach((reservation) => sumOrderItems(reservation.Orders));
      sumOrderItems(tableData.TableOrders);

      if (tableData.status === 'available') {
        totalRevenue = 0;
      }

      return {
        ...tableData,
        activeReservation: activeReservation || null,
        upcomingReservation: upcomingReservation || null,
        totalRevenue,
      };
    });
  },

  // Thêm bàn mới
  async createTable(data) {
    const { table_number, capacity } = data;

    const existingTable = await Table.findOne({ where: { table_number } });
    if (existingTable) {
      throw new Error("Số bàn đã tồn tại");
    }

    const table = await Table.create({
      table_number,
      capacity,
      status: "available",
      branch_id: 1,
    });

    return table;
  },

  // Sửa bàn
  async updateTable(tableNumber, data) {
    const table = await Table.findOne({ where: { table_number: tableNumber } });
    if (!table) throw new Error("Không tìm thấy bàn");

    const { table_number, capacity, status } = data;

    // Nếu đổi số bàn, kiểm tra số mới đã tồn tại chưa
    if (table_number && table_number !== table.table_number) {
      const existingTable = await Table.findOne({ where: { table_number } });
      if (existingTable) throw new Error("Số bàn mới đã tồn tại");
    }

    await table.update({
      table_number: table_number || table.table_number,
      capacity: capacity || table.capacity,
      status: status || table.status,
    });

    // Nếu chuyển trạng thái về "available" → hoàn tất toàn bộ phiên hiện tại
    if (status === "available") {
      const { Op } = require("sequelize");

      // Hoàn tất đơn gắn trực tiếp với bàn
      await Order.update(
        { status: "COMPLETED" },
        {
          where: {
            table_id: table.table_id,
            status: { [Op.notIn]: ["COMPLETED", "CANCELLED"] },
          },
        }
      );

      // Lấy reservation active của bàn
      const reservations = await Reservation.findAll({
        where: {
          table_id: table.table_id,
          status: { [Op.notIn]: ["completed", "cancelled"] },
        },
        attributes: ["reservation_id"],
      });
      const reservationIds = reservations.map((r) => r.reservation_id);

      // Hoàn tất đơn qua reservation
      if (reservationIds.length > 0) {
        await Order.update(
          { status: "COMPLETED" },
          {
            where: {
              reservation_id: { [Op.in]: reservationIds },
              status: { [Op.notIn]: ["COMPLETED", "CANCELLED"] },
            },
          }
        );
      }

      // Đóng tất cả reservation active
      await Reservation.update(
        { status: "completed" },
        {
          where: {
            table_id: table.table_id,
            status: { [Op.notIn]: ["completed", "cancelled"] },
          },
        }
      );
    }

    return table;
  },

  // Xóa bàn theo table_number
  async deleteTable(tableNumber) {
    const table = await Table.findOne({ where: { table_number: tableNumber } });
    if (!table) {
      throw new Error("Không tìm thấy bàn");
    }

    if (table.status !== "available") {
      throw new Error("Không thể xóa bàn đang được sử dụng");
    }

    await table.destroy();
    return { message: "Đã xóa bàn thành công" };
  },

  // Lấy hoạt động gần đây
  async getTableActivities() {
    const activities = await Reservation.findAll({
      limit: 10,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Table,
          required: true,
        },
        {
          model: User,
          required: false,
          attributes: ["user_id", "full_name", "phone"],
        },
        {
          model: Order,
          as: "Orders",
          required: false,
        },
      ],
    });

    return activities.map((activity) => {
      const activityData = activity.toJSON();
      return {
        ...activityData,
        activityType:
          activityData.Orders && activityData.Orders.length > 0
            ? "order"
            : "reservation",
        timestamp: activityData.created_at,
      };
    });
  },

  // Lấy thống kê tổng quan bàn – dùng chung tableSummary.service với Dashboard
  async getTableSummary(branchId = DEFAULT_BRANCH_ID) {
    const summary = await tableSummaryService.getTableSummary(branchId);
    const db = require("../../models/db");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const revenueQuery = `
      SELECT COALESCE(SUM(oi.quantity * mi.price), 0) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status = 'COMPLETED'
        AND o.created_at >= :today
    `;
    const [revenueResult] = await db.sequelize.query(revenueQuery, {
      replacements: { today },
      type: Sequelize.QueryTypes.SELECT,
    });

    return {
      totalTables: summary.totalTables,
      availableTables: summary.availableTables,
      occupiedTables: summary.servingTables,
      reservedTables: summary.reservedTables,
      currentRevenue: parseFloat(revenueResult.total) || 0,
    };
  },
};

module.exports = tableService;