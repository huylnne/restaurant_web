/**
 * MODEL ORDER ITEM — bảng order_items lưu từng món khách/phục vụ gọi trong một order.
 * Ctrl+F: OrderItem model, order_items.status, pending, processing, done, served
 * Luồng demo: đặt món trước/gọi thêm → bếp chế biến → phục vụ đánh dấu served.
 */
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
      // [PHIÊN BÀN] Món thuộc order/phiên phục vụ nào.
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'order_id' },
      },
      // [THỰC ĐƠN] Món nào trong menu_items.
      item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'menu_items', key: 'item_id' },
      },
      // [GỌI MÓN] Số lượng món khách gọi.
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // [BILL/BÁO CÁO] Giá chốt tại thời điểm gọi để sau này đổi giá menu không làm lệch bill cũ.
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Giá món tại thời điểm gọi món',
      },
      // [GỌI MÓN] Ghi chú riêng của món, ví dụ ít cay/không hành.
      note: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      // [BẾP] Pipeline món: pending → processing → done → served.
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'done', 'served'),
        allowNull: false,
        defaultValue: 'pending',
      },
      // [BẾP] Thời điểm thêm món, dùng sort hàng đợi bếp.
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

  // [QUAN HỆ] OrderItem thuộc một Order và một MenuItem.
  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, { foreignKey: 'order_id' });
    OrderItem.belongsTo(models.MenuItem, { foreignKey: 'item_id' });
  };

  return OrderItem;
};
