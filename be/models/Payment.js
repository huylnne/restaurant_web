'use strict';

/**
 * MODEL PAYMENT — bảng payments lưu phiên thanh toán và thông tin hóa đơn.
 * Ctrl+F: Payment model, payments.status, invoice_no, transaction_ref
 * Luồng demo: phục vụ xác nhận tiền mặt → payment succeeded → order completed → bàn cleaning.
 */
module.exports = (sequelize, DataTypes) => {

  const Payment = sequelize.define(

    'Payment',

    {

      payment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // [THANH TOÁN] Payment gắn với một order/phiên bàn.
      order_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        references: { model: 'orders', key: 'order_id' },

      },

      // [BILL] Số tiền phải thu tại thời điểm tạo/xác nhận payment.
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

      // [PHƯƠNG THỨC] CASH/BANK_TRANSFER/CARD/WALLET/MOMO/SEPAY...
      method: {

        type: DataTypes.STRING(15),

        allowNull: false,

        comment: 'CASH | BANK_TRANSFER | CARD | WALLET | MOMO | COD',

      },

      // [TRẠNG THÁI THANH TOÁN] pending/requires_action/succeeded/failed/canceled.
      status: {

        type: DataTypes.STRING(16),

        allowNull: false,

        defaultValue: 'pending',

        comment: 'pending | requires_action | succeeded | failed | canceled',

      },

      // [ĐỐI SOÁT] Mã giao dịch từ MoMo/SePay/chuyển khoản.
      transaction_ref: {

        type: DataTypes.STRING(64),

        allowNull: true,

      },

      // [THANH TOÁN] Thời điểm thực nhận tiền.
      paid_at: { type: DataTypes.DATE, allowNull: true },

      // [HÓA ĐƠN] Mã hóa đơn INV-... sinh khi thanh toán thành công.
      invoice_no: { type: DataTypes.STRING(20), allowNull: true },

      // [HÓA ĐƠN] Thời điểm phát hành hóa đơn PDF.
      invoice_issued_at: { type: DataTypes.DATE, allowNull: true },

      created_at: {

        type: DataTypes.DATE,

        allowNull: false,

        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),

      },

    },

    {

      tableName: 'payments',

      timestamps: false,

      underscored: true,

    }

  );



  // [QUAN HỆ] Payment thuộc một Order.
  Payment.associate = (models) => {

    Payment.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });

  };



  return Payment;

};

