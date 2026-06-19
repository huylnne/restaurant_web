module.exports = (sequelize, DataTypes) => {
  const OperationLog = sequelize.define(
    'OperationLog',
    {
      log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      username: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(40),
        allowNull: false,
        comment: 'Mã thao tác, ví dụ EMPLOYEE_CREATE',
      },
      module: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Nhóm chức năng: employees, menu, tables, orders...',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      entity_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      http_method: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      request_body: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      status_code: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'operation_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        { fields: ['created_at'] },
        { fields: ['module'] },
        { fields: ['action'] },
        { fields: ['user_id'] },
        { fields: ['branch_id'] },
      ],
    }
  );

  return OperationLog;
};
