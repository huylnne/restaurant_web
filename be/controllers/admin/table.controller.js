/**
 * CONTROLLER ADMIN TABLE — HTTP layer cho sơ đồ bàn, summary, CRUD bàn.
 * Ctrl+F: table controller, getTables, getTableSummary, createTable
 * Luồng demo: Phần 3 — sơ đồ bàn phục vụ và trạng thái bàn realtime.
 */
const tableService = require('../../services/admin/table.service');
const { filterTableListForRole, filterTableSummaryForRole } = require('../../utils/roleResponse');
const { resolveBranchId } = require('../../utils/branchScope');

/** [PHÂN QUYỀN] Lấy role để filter dữ liệu doanh thu trên sơ đồ bàn. Ctrl+F: getRole */
function getRole(req) {
  return req.userRole || req.user?.role;
}

/** [SƠ ĐỒ BÀN] Lấy danh sách bàn + phiên active + QR token + totalRevenue. Ctrl+F: getTables */
exports.getTables = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const tables = await tableService.getTables(branchId);
    // Lọc theo vai trò: chỉ admin/manager mới thấy doanh thu; waiter/kitchen bị ẩn số tiền.
    const filtered = filterTableListForRole(getRole(req), tables);
    res.json(filtered);
  } catch (error) {
    console.error('Lỗi getTables:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách bàn', error: error.message });
  }
};

/** [QUẢN LÝ BÀN] Admin tạo bàn mới. Ctrl+F: createTable */
exports.createTable = async (req, res) => {
  try {
    const payload = { ...req.body, branch_id: resolveBranchId(req, req.body.branch_id || req.query.branchId, 1) };
    const table = await tableService.createTable(payload);
    req.audit = { entityId: table.table_id, description: `Thêm bàn #${table.table_number || table.table_id}` };
    res.status(201).json(table);
  } catch (error) {
    console.error('Lỗi createTable:', error);
    res.status(400).json({ message: error.message });
  }
};

/** [QUẢN LÝ BÀN] Admin cập nhật bàn/sức chứa/trạng thái. Ctrl+F: updateTable */
exports.updateTable = async (req, res) => {
  try {
    const payload = { ...req.body, branch_id: resolveBranchId(req, req.body.branch_id || req.query.branchId, 1) };
    const table = await tableService.updateTable(req.params.id, payload);
    res.json(table);
  } catch (error) {
    console.error('Lỗi updateTable:', error);
    res.status(400).json({ message: error.message });
  }
};

/** [QUẢN LÝ BÀN] Admin xóa bàn nếu không vướng order. Ctrl+F: deleteTable */
exports.deleteTable = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const result = await tableService.deleteTable(req.params.id, branchId);
    res.json(result);
  } catch (error) {
    console.error('Lỗi deleteTable:', error);
    res.status(400).json({ message: error.message });
  }
};

/** [SƠ ĐỒ BÀN] Hoạt động gần đây theo bàn/order. Ctrl+F: getTableActivities */
exports.getTableActivities = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const activities = await tableService.getTableActivities(branchId);
    res.json(activities);
  } catch (error) {
    console.error('Lỗi getTableActivities:', error);
    res.status(500).json({ message: 'Lỗi lấy hoạt động bàn', error: error.message });
  }
};

/** [SƠ ĐỒ BÀN] Summary trạng thái bàn và doanh thu hiện tại. Ctrl+F: getTableSummary */
exports.getTableSummary = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const summary = await tableService.getTableSummary(branchId);
    const filtered = filterTableSummaryForRole(getRole(req), summary);
    res.json(filtered);
  } catch (error) {
    console.error('Lỗi getTableSummary:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê bàn', error: error.message });
  }
};