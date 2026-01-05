module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define('Employee', {
    employee_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branches',
        key: 'branch_id'
      }
    },
    position: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Chức vụ: manager, chef, waiter, cashier'
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    hire_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'on_leave'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'employees',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Employee;
};