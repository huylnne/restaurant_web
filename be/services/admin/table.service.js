/**
 * SERVICE ADMIN TABLE — logic sơ đồ bàn, QR token, CRUD bàn, activity và summary.
 * Ctrl+F: table service, ensureQrToken, getTables, getTableActivities, getTableSummary
 * Luồng demo: Phần 3 — phục vụ xem sơ đồ bàn, copy QR, thanh toán chuyển bàn cleaning.
 */
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
  /** [QR BÀN] Đảm bảo mỗi bàn có qr_token public duy nhất cho link /t/{token}. Ctrl+F: ensureQrToken */
  async ensureQrToken(table) {
    if (table.qr_token) return table.qr_token; // đã có token thì dùng lại, không sinh mới.
    // Thử tối đa 5 lần: sinh chuỗi hex 32 ký tự ngẫu nhiên, kiểm tra trùng trong DB rồi mới gán.
    for (let i = 0; i < 5; i++) {
      const token = crypto.randomBytes(16).toString("hex");
      const exists = await Table.findOne({ where: { qr_token: token }, attributes: ["table_id"] });
      if (!exists) {
        await table.update({ qr_token: token });
        return token;
      }
    }
    // Rất hiếm khi 5 lần đều trùng → coi như lỗi hệ thống.
    throw new Error("Không thể sinh QR token cho bàn");
  },

  /** [SƠ ĐỒ BÀN] Lấy danh sách bàn kèm order active, khách, món, QR token, doanh thu tạm tính. Ctrl+F: getTables table service */
  async getTables(branchId = DEFAULT_BRANCH_ID) {
    // B1: dọn trước các reservation quá giờ (no-show) để sơ đồ phản ánh đúng trạng thái hiện tại.
    await tableSummaryService.expireReservationsForBranch(branchId);

    // Chỉ quan tâm order chưa ở trạng thái kết thúc (pending/confirmed/occupied...), bỏ completed/cancelled.
    const ACTIVE_ORDER_STATUSES = notTerminalOrderStatusWhere();

    // B2: lấy toàn bộ bàn của chi nhánh kèm order gắn TRỰC TIẾP (table_id) + khách + món (để tính tiền tạm).
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

    // B3: bàn nào chưa có QR token thì sinh bổ sung (chạy song song, lỗi 1 bàn không chặn cả list).
    await Promise.all(
      tables
        .filter((t) => !t.qr_token)
        .map((t) => this.ensureQrToken(t).catch(() => null))
    );

    // B4: lấy order gắn GIÁN TIẾP qua bảng nối OrderTable (trường hợp ghép nhiều bàn cho 1 order).
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

    // Gom các order ghép-bàn theo table_id → Map(table_id → [order,...]), tránh trùng order_id.
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

    // B5: với mỗi bàn, hợp nhất order trực tiếp + order ghép rồi tính các thông tin hiển thị.
    return tables.map((table) => {
      const tableData = table.toJSON();
      const now = new Date();
      const directOrders = tableData.TableOrders || []; // order gắn thẳng table_id
      const linkedOrders = linkedOrdersByTable.get(tableData.table_id) || []; // order ghép bàn
      // Hợp nhất 2 nguồn, loại trùng theo order_id.
      const activeOrders = [...directOrders];
      for (const linked of linkedOrders) {
        if (!activeOrders.some((o) => o.order_id === linked.order_id)) {
          activeOrders.push(linked);
        }
      }

      // activeReservation = đơn đang phục vụ/khách sắp tới trong khoảng ±2 giờ so với hiện tại,
      // chỉ xét khi bàn KHÔNG trống và KHÔNG dọn dẹp.
      const activeReservation =
        tableData.status !== TABLE_STATUS.AVAILABLE &&
        tableData.status !== TABLE_STATUS.CLEANING
          ? (activeOrders.find((o) => {
              const arrival = new Date(o.arrival_time || o.created_at);
              const timeDiff = (arrival - now) / (1000 * 60 * 60); // chênh lệch giờ (âm = đã qua giờ hẹn)
              return timeDiff >= -2 && timeDiff <= 2;
            }) ?? null)
          : null;

      // upcomingReservation = đặt bàn tương lai (0 → 24h tới) khi bàn đang TRỐNG,
      // để hiển thị "bàn này sắp có khách đặt".
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

      // Doanh thu tạm tính của bàn = tổng (đơn giá × số lượng) mọi món trong các order active.
      // Chỉ tính khi bàn đang có khách (không trống, không dọn dẹp).
      let totalRevenue = 0;
      if (
        tableData.status !== TABLE_STATUS.AVAILABLE &&
        tableData.status !== TABLE_STATUS.CLEANING
      ) {
        activeOrders.forEach((order) => {
          (order.OrderItems || []).forEach((item) => {
            // Ưu tiên giá menu hiện tại; nếu thiếu thì lấy giá lưu trong order_item.
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

  /** [QUẢN LÝ BÀN] Tạo bàn mới, validate table_number/capacity/status/branch. Ctrl+F: createTable table service */
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

  /** [QUẢN LÝ BÀN] Cập nhật bàn và nếu status kết thúc phiên thì complete order chưa terminal. Ctrl+F: updateTable table service */
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

    // Nếu chuyển sang trạng thái kết thúc phiên (vd available/cleaning) → đóng mọi order chưa terminal của bàn,
    // tránh còn "đơn treo" khi bàn đã được dọn/giải phóng.
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

  /** [QUẢN LÝ BÀN] Xóa bàn trong chi nhánh, fail nếu không tìm thấy. Ctrl+F: deleteTable table service */
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

  /** [SƠ ĐỒ BÀN] Hoạt động/bill gần đây theo order hoàn thành hoặc đang phục vụ. Ctrl+F: getTableActivities */
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

  /** [SƠ ĐỒ BÀN] Summary bàn + currentRevenue cho card thống kê. Ctrl+F: getTableSummary table service */
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
