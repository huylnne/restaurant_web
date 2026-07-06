/**
 * MODEL ORDER TABLE — bảng nối order_tables cho nghiệp vụ ghép nhiều bàn vào một order.
 * Ctrl+F: OrderTable model, order_tables, ghép bàn, is_primary
 * Luồng demo: đặt bàn nhóm đông có thể ghép bàn liền kề.
 */
module.exports = (sequelize, DataTypes) => {
  const OrderTable = sequelize.define(
    "OrderTable",
    {
      // [GHÉP BÀN] Order/phiên phục vụ được link.
      order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "orders", key: "order_id" },
      },
      // [GHÉP BÀN] Bàn vật lý thuộc order.
      table_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "tables", key: "table_id" },
      },
      // [GHÉP BÀN] Bàn chính để hiển thị/fallback bill.
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

  // [QUAN HỆ] Bảng nối thuộc Order và Table.
  OrderTable.associate = (models) => {
    OrderTable.belongsTo(models.Order, { foreignKey: "order_id" });
    OrderTable.belongsTo(models.Table, { foreignKey: "table_id" });
  };

  return OrderTable;
};
