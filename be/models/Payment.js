'use strict';

module.exports = (sequelize, DataTypes) => {

  const Payment = sequelize.define(

    'Payment',

    {

      payment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      order_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        references: { model: 'orders', key: 'order_id' },

      },

      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

      method: {

        type: DataTypes.STRING(15),

        allowNull: false,

        comment: 'CASH | BANK_TRANSFER | CARD | WALLET | MOMO | COD',

      },

      status: {

        type: DataTypes.STRING(16),

        allowNull: false,

        defaultValue: 'pending',

        comment: 'pending | requires_action | succeeded | failed | canceled',

      },

      transaction_ref: {

        type: DataTypes.STRING(64),

        allowNull: true,

      },

      paid_at: { type: DataTypes.DATE, allowNull: true },

      invoice_no: { type: DataTypes.STRING(20), allowNull: true },

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



  Payment.associate = (models) => {

    Payment.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });

  };



  return Payment;

};

