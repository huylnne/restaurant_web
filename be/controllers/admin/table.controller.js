const tableService = require('../../services/admin/table.service');

exports.getTables = async (req, res) => {
  try {
    const tables = await tableService.getTables();
    res.json(tables);
  } catch (error) {
    console.error('Lỗi getTables:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách bàn', error: error.message });
  }
};

exports.createTable = async (req, res) => {
  try {
    const table = await tableService.createTable(req.body);
    res.status(201).json(table);
  } catch (error) {
    console.error('Lỗi createTable:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const table = await tableService.updateTable(req.params.id, req.body);
    res.json(table);
  } catch (error) {
    console.error('Lỗi updateTable:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const result = await tableService.deleteTable(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Lỗi deleteTable:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getTableActivities = async (req, res) => {
  try {
    const activities = await tableService.getTableActivities();
    res.json(activities);
  } catch (error) {
    console.error('Lỗi getTableActivities:', error);
    res.status(500).json({ message: 'Lỗi lấy hoạt động bàn', error: error.message });
  }
};

exports.getTableSummary = async (req, res) => {
  try {
    const summary = await tableService.getTableSummary();
    res.json(summary);
  } catch (error) {
    console.error('Lỗi getTableSummary:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê bàn', error: error.message });
  }
};