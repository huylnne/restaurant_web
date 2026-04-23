const tableService = require('../../services/admin/table.service');
const { filterTableListForRole, filterTableSummaryForRole } = require('../../utils/roleResponse');
const { resolveBranchId } = require('../../utils/branchScope');

function getRole(req) {
  return req.userRole || req.user?.role;
}

exports.getTables = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const tables = await tableService.getTables(branchId);
    const filtered = filterTableListForRole(getRole(req), tables);
    res.json(filtered);
  } catch (error) {
    console.error('Lỗi getTables:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách bàn', error: error.message });
  }
};

exports.createTable = async (req, res) => {
  try {
    const payload = { ...req.body, branch_id: resolveBranchId(req, req.body.branch_id || req.query.branchId, 1) };
    const table = await tableService.createTable(payload);
    res.status(201).json(table);
  } catch (error) {
    console.error('Lỗi createTable:', error);
    res.status(400).json({ message: error.message });
  }
};

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