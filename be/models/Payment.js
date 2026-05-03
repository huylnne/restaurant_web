// be/models/payment.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    payment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // Legacy: thanh toán theo order (giữ để tương thích dữ liệu cũ)
    order_id:   { type: DataTypes.INTEGER, allowNull: true },
    // Thanh toán theo "phiên bàn" (reservation) để amount lấy theo bill tạm tính
    reservation_id: { type: DataTypes.INTEGER, allowNull: true },
    amount:     { type: DataTypes.DECIMAL(10,2), allowNull: false },
    method:     { type: DataTypes.STRING(50), allowNull: false }, // 'COD' | 'MOMO' | 'VNPAY' ...
    status:     { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pending' }, // pending|requires_action|succeeded|failed|canceled
    transaction_ref: { type: DataTypes.STRING(100), allowNull: true }, // mã giao dịch từ cổng
    paid_at:    { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'payments',
    timestamps: false,        
    underscored: true,
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
    Payment.belongsTo(models.Reservation, { foreignKey: 'reservation_id', as: 'reservation' });
  };

  return Payment;
};
