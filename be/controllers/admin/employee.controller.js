const employeeService = require('../../services/admin/employee.service');

class EmployeeController {
  // GET /api/admin/employees?branch_id=1&page=1&limit=10&search=
  async getEmployees(req, res) {
    try {
      const { branch_id, page = 1, limit = 10, search = '' } = req.query;

      if (!branch_id) {
        return res.status(400).json({ message: 'branch_id là bắt buộc' });
      }

      const result = await employeeService.getEmployeesByBranch(
        branch_id,
        page,
        limit,
        search
      );

      res.json(result);
    } catch (error) {
      console.error('Error in getEmployees:', error);
      res.status(500).json({ message: error.message });
    }
  }

  // GET /api/admin/employees/:id
  async getEmployeeById(req, res) {
    try {
      const { id } = req.params;
      const employee = await employeeService.getEmployeeById(id);
      res.json(employee);
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      res.status(404).json({ message: error.message });
    }
  }

  // POST /api/admin/employees
  async createEmployee(req, res) {
    try {
      const employee = await employeeService.createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error) {
      console.error('Error in createEmployee:', error);
      res.status(400).json({ message: error.message });
    }
  }

  // PUT /api/admin/employees/:id
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const employee = await employeeService.updateEmployee(id, req.body);
      res.json(employee);
    } catch (error) {
      console.error('Error in updateEmployee:', error);
      res.status(400).json({ message: error.message });
    }
  }

  // DELETE /api/admin/employees/:id
  async deleteEmployee(req, res) {
    try {
      const { id } = req.params;
      const result = await employeeService.deleteEmployee(id);
      res.json(result);
    } catch (error) {
      console.error('Error in deleteEmployee:', error);
      res.status(400).json({ message: error.message });
    }
  }

  // GET /api/admin/employees/stats/:branch_id
  async getEmployeeStats(req, res) {
    try {
      const { branch_id } = req.params;
      const stats = await employeeService.getEmployeeStats(branch_id);
      res.json(stats);
    } catch (error) {
      console.error('Error in getEmployeeStats:', error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new EmployeeController();