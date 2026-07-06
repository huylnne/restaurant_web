/**
 * MODEL ORDER — bảng orders lưu cả đặt bàn online, khách vãng lai, phiên đang phục vụ.
 * Ctrl+F: Order model, orders.status, reservation, walk_in, payment_status
 * Luồng nghiệp vụ: pending/confirmed → check-in → in_progress/waiting_payment → completed.
 */
module.exports = (sequelize, DataTypes) => {

  const Order = sequelize.define(

    'Order',

    {

      order_id: {

        type: DataTypes.INTEGER,

        primaryKey: true,

        autoIncrement: true,

        allowNull: false,

      },

      // [KHÁCH/NHÂN VIÊN] user_id là khách đặt bàn; với walk_in có thể là nhân viên tạo phiên.
      user_id: {

        type: DataTypes.INTEGER,

        allowNull: true,

        references: { model: 'users', key: 'user_id' },

      },

      // [CHI NHÁNH] Chi nhánh phục vụ order, dùng phân quyền và báo cáo.
      branch_id: {

        type: DataTypes.INTEGER,

        allowNull: true,

        references: { model: 'branches', key: 'branch_id' },

      },

      // [BÀN CHÍNH] Bàn chính của phiên; bàn ghép nằm thêm trong order_tables.
      table_id: {

        type: DataTypes.INTEGER,

        allowNull: true,

        references: { model: 'tables', key: 'table_id' },

      },

      // [ĐẶT BÀN] Giờ khách dự kiến đến hoặc giờ tạo phiên walk-in.
      arrival_time: {

        type: DataTypes.DATE,

        allowNull: true,

      },

      // [ĐẶT BÀN] Mốc hết giữ bàn để kiểm tra trùng lịch.
      expected_end_time: {

        type: DataTypes.DATE,

        allowNull: true,

        comment: 'Thời điểm dự kiến kết thúc giữ bàn (arrival_time + 2 giờ)',

      },

      // [ĐẶT BÀN] Số khách để chọn bàn/ghép bàn.
      number_of_guests: {

        type: DataTypes.INTEGER,

        allowNull: true,

      },

      // [VÒNG ĐỜI PHIÊN] Trạng thái chính điều khiển check-in, bếp, bill, thanh toán.
      status: {

        type: DataTypes.STRING(20),

        allowNull: false,

        defaultValue: 'pending',

        comment:

          'pending | confirmed | pre-ordered | in_progress | waiting_payment | completed | cancelled | no_show',

      },

      // [BILL] Tổng tiền đồng bộ từ order_items, phục vụ dashboard/báo cáo.
      total_amount: {

        type: DataTypes.DECIMAL(10, 2),

        allowNull: true,

      },

      // [GHI CHÚ] Ghi chú của khách/phục vụ, ví dụ cần bàn yên tĩnh.
      note: {

        type: DataTypes.STRING(200),

        allowNull: true,

      },

      // [LOẠI PHIÊN] reservation=đặt online, walk_in=khách vãng lai, dine_in=QR/check-in phụ.
      order_type: {

        type: DataTypes.STRING(15),

        allowNull: false,

        defaultValue: 'dine_in',

        comment: 'reservation | walk_in | dine_in',

      },

      // [THANH TOÁN] Trạng thái tiền của phiên, độc lập với orders.status.
      payment_status: {

        type: DataTypes.STRING(16),

        allowNull: false,

        defaultValue: 'unpaid',

        comment: 'unpaid | pending | succeeded | failed | canceled',

      },

      // [GHÉP BÀN] Nhóm nhiều order/bàn nếu cần gom bill hoặc lịch sử theo group.
      booking_group_id: {

        type: DataTypes.STRING(36),

        allowNull: true,

      },

      // [CHECK-IN] Thời điểm nhân viên xác nhận khách đã tới.
      checked_in_at: {

        type: DataTypes.DATE,

        allowNull: true,

        comment: 'Thời điểm nhân viên xác nhận tiếp nhận khách vào bàn',

      },

      created_at: {

        type: DataTypes.DATE,

        allowNull: false,

        defaultValue: DataTypes.NOW,

      },

    },

    {

      tableName: 'orders',

      timestamps: false,

    }

  );



  // [QUAN HỆ] Order nối với chi nhánh, bàn, khách, món, thanh toán, đánh giá.
  Order.associate = (models) => {

    Order.belongsTo(models.Branch, { foreignKey: 'branch_id' });

    Order.belongsTo(models.Table, { foreignKey: 'table_id' });

    Order.belongsTo(models.User, { foreignKey: 'user_id' });

    Order.hasMany(models.OrderItem, { foreignKey: 'order_id' });

    Order.hasOne(models.Payment, { foreignKey: 'order_id' });

    Order.hasOne(models.Review, { foreignKey: 'order_id' });

  };



  return Order;

};

