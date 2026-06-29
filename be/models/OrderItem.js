module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      order_item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'order_id' },
      },
      item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'menu_items', key: 'item_id' },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Giá món tại thời điểm gọi món',
      },
      note: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'done', 'served'),
        allowNull: false,
        defaultValue: 'pending',
      },
      ordered_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời điểm gọi món (mỗi lần thêm món)',
      },
    },
    {
      tableName: 'order_items',
      timestamps: false,
    }
  );

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, { foreignKey: 'order_id' });
    OrderItem.belongsTo(models.MenuItem, { foreignKey: 'item_id' });
  };

  return OrderItem;
};
