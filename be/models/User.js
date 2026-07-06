/**
 * MODEL USER — bảng users lưu khách hàng, admin và nhân viên đăng nhập.
 * Ctrl+F: User model, users.role, locked, is_active, demo_khach
 * Luồng demo: đăng ký khách role=user, đăng nhập waiter/kitchen/admin bằng role tương ứng.
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'user_id',
      },
      // [PHÂN QUYỀN CHI NHÁNH] Nhân viên/manager gắn chi nhánh; khách/admin có thể null.
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'branches', key: 'branch_id' },
      },
      // [ĐĂNG NHẬP] Tên đăng nhập duy nhất, validate chữ thường/số/gạch dưới.
      username: {
        type: DataTypes.STRING(30),
        unique: true,
        allowNull: false,
      },
      // [BẢO MẬT] Mật khẩu chỉ lưu hash bcrypt, không lưu plain text.
      password_hash: {
        type: DataTypes.STRING(60),
        allowNull: false,
        comment: 'Hash bcrypt (60 ký tự)',
      },
      // [HỒ SƠ] Họ tên khách/nhân viên.
      full_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      // [ĐĂNG KÝ/HỒ SƠ] SĐT duy nhất để admin/nhân viên tìm khách.
      phone: {
        type: DataTypes.STRING(10),
        allowNull: true,
        unique: true,
        comment: 'SĐT Việt Nam: 10 chữ số, bắt đầu bằng 0',
      },
      // [PHÂN QUYỀN] Quyết định màn hình/API được truy cập.
      role: {
        type: DataTypes.ENUM('admin', 'waiter', 'kitchen', 'manager', 'user'),
        allowNull: false,
      },
      // [HỒ SƠ] Ảnh đại diện khách/nhân viên.
      avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue:
          'https://tse3.mm.bing.net/th/id/OIP.aCwqDO1MIaS3qzA7DyFPdAHaHa?pid=Api&P=0&h=180',
      },
      // [TÀI KHOẢN] false = vô hiệu hóa tài khoản.
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      // [TÀI KHOẢN] true = khóa tài khoản, không được đăng nhập/đặt bàn.
      locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'users',
      timestamps: false,
    }
  );

  return User;
};
