const receptionService = require("../../services/admin/reception.service");
const { resolveBranchId } = require("../../utils/branchScope");

exports.listUpcomingArrivals = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const results = await receptionService.listUpcomingArrivals(branchId);
    res.json({ results });
  } catch (error) {
    console.error("reception.listUpcomingArrivals:", error);
    res.status(500).json({ message: error.message || "Lỗi tải danh sách đặt bàn" });
  }
};

exports.searchArrivals = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const q = req.query.q || req.query.query || "";
    const results = await receptionService.searchArrivals(branchId, q);
    res.json({ results });
  } catch (error) {
    console.error("reception.searchArrivals:", error);
    res.status(500).json({ message: error.message || "Lỗi tìm kiếm" });
  }
};

exports.confirmArrival = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.body.branch_id || req.query.branchId, 1);
    const orderId = req.body.order_id || req.body.reservation_id;
    if (!orderId) {
      return res.status(400).json({ message: "Thiếu order_id" });
    }
    const result = await receptionService.confirmArrival(orderId, branchId);
    req.audit = {
      entityId: orderId,
      description: `Tiếp nhận đặt bàn #${orderId}`,
      metadata: { branchId, table_id: result.table?.table_id },
    };
    res.json({
      message: result.alreadyCheckedIn
        ? "Khách đã được tiếp nhận trước đó"
        : "Tiếp nhận thành công",
      ...result,
    });
  } catch (error) {
    console.error("reception.confirmArrival:", error);
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : ["INVALID_STATUS", "NO_TABLE", "TABLE_BUSY"].includes(error.code)
          ? 400
          : 500;
    res.status(status).json({ message: error.message, code: error.code });
  }
};

exports.walkInCheckIn = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.body.branch_id || req.query.branchId, 1);
    const { table_id, table_ids, number_of_guests } = req.body;
    if (!table_id && !(Array.isArray(table_ids) && table_ids.length)) {
      return res.status(400).json({ message: "Thiếu bàn cần xếp khách" });
    }
    const staffUserId = req.user?.user_id || req.userId;
    if (!staffUserId) {
      return res.status(401).json({ message: "Chưa xác thực người dùng" });
    }
    const result = await receptionService.walkInCheckIn({
      branchId,
      tableId: table_id,
      tableIds: table_ids,
      numberOfGuests: number_of_guests,
      staffUserId,
    });
    const auditTableIds = result.tables?.map((table) => table.table_id) || [result.table?.table_id].filter(Boolean);
    req.audit = {
      entityId: result.order?.order_id,
      description: `Tiếp nhận walk-in bàn #${auditTableIds.join(", #")}`,
      metadata: { branchId, number_of_guests, table_ids: auditTableIds },
    };
    res.status(201).json({
      message: "Xếp bàn thành công",
      ...result,
    });
  } catch (error) {
    console.error("reception.walkInCheckIn:", error);
    const status =
      error.code === "TABLE_NOT_FOUND"
        ? 404
        : [
            "TABLE_NOT_AVAILABLE",
            "TABLE_RESERVED",
            "TABLE_BUSY",
            "CAPACITY_EXCEEDED",
            "INVALID_GUESTS",
          ].includes(error.code)
          ? 400
          : 500;
    res.status(status).json({ message: error.message, code: error.code });
  }
};

exports.getWalkInTables = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const guests = parseInt(req.query.guests, 10) || 1;
    const tables = await receptionService.getWalkInTables(branchId, guests);
    res.json({ tables });
  } catch (error) {
    console.error("reception.getWalkInTables:", error);
    res.status(500).json({ message: error.message || "Lỗi lấy danh sách bàn" });
  }
};
