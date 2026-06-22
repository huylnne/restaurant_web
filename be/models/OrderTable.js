module.exports = (sequelize, DataTypes) => {
  const OrderTable = sequelize.define(
    "OrderTable",
    {
      order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "orders", key: "order_id" },
      },
      table_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "tables", key: "table_id" },
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "order_tables",
      timestamps: false,
    }
  );

  OrderTable.associate = (models) => {
    OrderTable.belongsTo(models.Order, { foreignKey: "order_id" });
    OrderTable.belongsTo(models.Table, { foreignKey: "table_id" });
  };

  return OrderTable;
};
