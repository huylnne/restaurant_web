const {
  Table,
  Reservation,
  Order,
  User,
  OrderItem,
  MenuItem,
} = require("../../models");
const { Sequelize } = require("sequelize");
const tableSummaryService = require("./tableSummary.service");

const DEFAULT_BRANCH_ID = tableSummaryService.DEFAULT_BRANCH_ID;

const tableService = {
  // Lấy danh sách bàn (cùng branch với getTableSummary để số liệu khớp).
  // Trước khi trả về: tự chuyển bàn đặt trước quá 15 phút (khách chưa tới) thành trống.
  async getTables(branchId = DEFAULT_BRANCH_ID) {
    await tableSummaryService.expireReservationsForBranch(branchId);

    const tables = await Table.findAll({
      where: { branch_id: branchId },
      include: [
        {
          model: Reservation,
          required: false,
          include: [
            {
              model: Order,
              as: "Orders",
              required: false,
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
        // Đơn waiter tạo trực tiếp cho bàn (order.table_id = table.table_id)
        {
          model: Order,
          as: "TableOrders",
          required: false,
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

      // Tìm reservation đang ACTIVE (confirmed và đang diễn ra HOẶC sắp tới trong vòng 2 giờ)
      const activeReservation = tableData.Reservations?.find((r) => {
        const reservationTime = new Date(r.reservation_time);
        const timeDiff = (reservationTime - now) / (1000 * 60 * 60); // giờ
        return r.status === "confirmed" && timeDiff >= -2 && timeDiff <= 2;
      });

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

    // Nếu chuyển trạng thái về "available", xóa reservation hiện tại (nếu có)
    if (status === "available") {
      await Reservation.update(
        { status: "completed" },
        {
          where: {
            table_id: table.table_id,
            status: "confirmed",
          },
        }
      );
      // Có thể xóa hoặc cập nhật thêm các trường khác nếu cần
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