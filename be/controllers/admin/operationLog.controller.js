/**
 * CONTROLLER OPERATION LOG — HTTP layer cho màn nhật ký thao tác admin.
 * Ctrl+F: operation log controller, list operation logs, nhật ký thao tác
 * Luồng demo: Phần 5 — Bước 5.8 xem audit các thao tác quan trọng.
 */
const operationLogService = require('../../services/operationLog.service');

class OperationLogController {
  /** [NHẬT KÝ] Danh sách log có filter/pagination từ operationLog.service. Ctrl+F: list operation logs */
  async list(req, res) {
    try {
      const result = await operationLogService.listLogs(req, req.query);
      res.json(result);
    } catch (error) {
      console.error('Error in list operation logs:', error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new OperationLogController();
