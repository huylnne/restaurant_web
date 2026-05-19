const operationLogService = require('../../services/operationLog.service');

class OperationLogController {
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
