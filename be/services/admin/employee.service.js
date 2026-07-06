/**
 * SERVICE ADMIN EMPLOYEE — logic quản lý nhân viên theo chi nhánh.
 * Ctrl+F: employee service, getEmployeesByBranch, createEmployee, getEmployeeStats
 * Luồng demo: Phần 5 — Bước 5.5 lọc waiter1/kitchen1/manager theo chi nhánh.
 */
const { Employee, User } = require('../../models');
const { Op } = require('sequelize');

class EmployeeService {
  /** [NHÂN VIÊN] Lấy danh sách nhân viên theo chi nhánh, phân trang/search. Ctrl+F: getEmployeesByBranch */
  async getEmployeesByBranch(branchId, page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    
    const whereClause = {
      branch_id: branchId
    };

    // Nếu có search, tìm theo tên hoặc email
    const includeWhere = search ? {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { count, rows } = await Employee.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['user_id', 'full_name', 'phone'],
        where: includeWhere
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return {
      employees: rows,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    };
  }

  /** [NHÂN VIÊN] Lấy thông tin 1 nhân viên kèm User. Ctrl+F: getEmployeeById service */
  async getEmployeeById(employeeId) {
    const employee = await Employee.findByPk(employeeId, {
      include: [{
        model: User,
        attributes: ['user_id', 'full_name', 'phone']
      }]
    });

    if (!employee) {
      throw new Error('Không tìm thấy nhân viên');
    }

    return employee;
  }

  /** [NHÂN VIÊN] Thêm nhân viên mới, kiểm tra user chưa thuộc employee. Ctrl+F: createEmployee service */
  async createEmployee(data) {
    const { user_id, branch_id, position, salary, hire_date, status } = data;

    // Kiểm tra user đã là nhân viên chưa
    const existingEmployee = await Employee.findOne({ where: { user_id } });
    if (existingEmployee) {
      throw new Error('User này đã là nhân viên');
    }

    const employee = await Employee.create({
      user_id,
      branch_id,
      position,
      salary: salary || 0,
      hire_date: hire_date || new Date(),
      status: status || 'active'
    });

    return await this.getEmployeeById(employee.employee_id);
  }

  /** [NHÂN VIÊN] Cập nhật branch/position/salary/status. Ctrl+F: updateEmployee service */
  async updateEmployee(employeeId, data) {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      throw new Error('Không tìm thấy nhân viên');
    }

    const { position, salary, hire_date, status, branch_id } = data;

    await employee.update({
      position: position || employee.position,
      salary: salary !== undefined ? salary : employee.salary,
      hire_date: hire_date || employee.hire_date,
      status: status || employee.status,
      branch_id: branch_id || employee.branch_id
    });

    return await this.getEmployeeById(employeeId);
  }

  /** [NHÂN VIÊN] Xóa nhân viên khỏi bảng employees. Ctrl+F: deleteEmployee service */
  async deleteEmployee(employeeId) {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      throw new Error('Không tìm thấy nhân viên');
    }

    await employee.destroy();
    return { message: 'Xóa nhân viên thành công' };
  }

  /** [NHÂN VIÊN] Thống kê tổng/active/inactive và nhóm theo position. Ctrl+F: getEmployeeStats */
  async getEmployeeStats(branchId) {
    const totalEmployees = await Employee.count({ where: { branch_id: branchId } });
    
    const activeEmployees = await Employee.count({ 
      where: { 
        branch_id: branchId, 
        status: 'active' 
      } 
    });

    const byPosition = await Employee.findAll({
      where: { branch_id: branchId },
      attributes: [
        'position',
        [Employee.sequelize.fn('COUNT', Employee.sequelize.col('employee_id')), 'count']
      ],
      group: ['position']
    });

    return {
      total: totalEmployees,
      active: activeEmployees,
      inactive: totalEmployees - activeEmployees,
      byPosition
    };
  }
}

module.exports = new EmployeeService();