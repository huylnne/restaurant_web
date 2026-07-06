/**
 * MODEL OPERATION LOG — bảng operation_logs lưu nhật ký thao tác để truy vết.
 * Ctrl+F: OperationLog model, operation_logs, action, module, metadata
 * Luồng demo: Phần 5 — Bước 5.8 xem log đăng ký/đặt bàn/check-in/thanh toán.
 */
module.exports = (sequelize, DataTypes) => {
  const OperationLog = sequelize.define(
    'OperationLog',
    {
      log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // [NGƯỜI THAO TÁC] user_id nếu request có đăng nhập.
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // [NGƯỜI THAO TÁC] Username snapshot tại thời điểm log.
      username: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      // [PHÂN QUYỀN] Role của người thao tác.
      role: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      // [CHI NHÁNH] Chi nhánh liên quan để manager/admin filter log.
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // [AUDIT] Mã hành động, ví dụ RESERVATION_CREATE, WAITER_PAYMENT_CHECKOUT.
      action: {
        type: DataTypes.STRING(40),
        allowNull: false,
        comment: 'Mã thao tác, ví dụ EMPLOYEE_CREATE',
      },
      // [AUDIT] Nhóm chức năng: auth/reservations/payments/tables...
      module: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Nhóm chức năng: employees, menu, tables, orders...',
      },
      // [AUDIT] Mô tả dễ đọc bằng tiếng Việt cho Admin xem.
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // [AUDIT] Loại đối tượng bị tác động: user/order/table/payment...
      entity_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      // [AUDIT] ID đối tượng bị tác động.
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
      // [AUDIT] Body request đã lọc; route nhạy cảm dùng skipBody.
      request_body: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      // [AUDIT] Thông tin bổ sung nghiệp vụ: table_id, item_count, method...
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
