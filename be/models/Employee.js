/**
 * MODEL EMPLOYEE — bảng employees lưu hồ sơ nhân viên, liên kết với users để đăng nhập.
 * Ctrl+F: Employee model, employees, position, salary, branch_id
 * Luồng demo: Phần 5 — admin xem waiter1/kitchen1/manager theo chi nhánh.
 */
module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define('Employee', {
    employee_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // [TÀI KHOẢN NHÂN VIÊN] Link tới users để đăng nhập bằng role waiter/kitchen/manager.
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    // [CHI NHÁNH] Nhân viên thuộc chi nhánh nào.
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branches',
        key: 'branch_id'
      }
    },
    // [CHỨC VỤ] Vị trí nghiệp vụ: manager/chef/waiter/cashier.
    position: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Chức vụ: manager, chef, waiter, cashier',
    },
    // [NHÂN SỰ] Lương nhân viên, dùng cho quản trị nội bộ.
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    // [NHÂN SỰ] Ngày vào làm.
    hire_date: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    // [NHÂN SỰ] Trạng thái làm việc: active/inactive/on_leave.
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'on_leave'),
      allowNull: false,
      defaultValue: 'active',
    },
  }, {
    tableName: 'employees',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Employee;
};