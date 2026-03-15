module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    order_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reservation_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Cho phép null vì có order không qua reservation
    },
    table_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Waiter tạo đơn gắn trực tiếp bàn; user đặt món qua reservation
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Thêm trường này
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pre-ordered'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  }, {
    tableName: 'orders',
    timestamps: false,
  });

  Order.associate = (models) => {
    Order.belongsTo(models.Reservation, { foreignKey: 'reservation_id' });
    Order.belongsTo(models.Table, { foreignKey: 'table_id' });
    Order.belongsTo(models.User, { foreignKey: 'user_id' });
    Order.hasMany(models.OrderItem, { foreignKey: 'order_id' });
    Order.hasOne(models.Payment, { foreignKey: 'order_id' });
  };

  return Order;
};