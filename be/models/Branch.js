/**
 * MODEL BRANCH — bảng branches lưu thông tin chi nhánh nhà hàng.
 * Ctrl+F: Branch model, branches, open_time, close_time, latitude, longitude
 * Luồng demo: Phần 2 xem chi nhánh, Phần 5 admin quản lý chi nhánh.
 */
module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define(
    'Branch',
    {
      branch_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      // [CHI NHÁNH] Tên đầy đủ chi nhánh hiển thị cho khách/admin.
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      // [CHI NHÁNH] Địa chỉ phục vụ trang danh sách chi nhánh.
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // [LIÊN HỆ] SĐT chi nhánh.
      phone: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      // [GIỜ MỞ CỬA] Giờ bắt đầu nhận khách/đặt bàn.
      open_time: {
        type: DataTypes.STRING(8),
        allowNull: true,
        comment: 'Định dạng HH:MM',
      },
      // [GIỜ ĐÓNG CỬA] Giờ kết thúc phục vụ, dùng validate đặt bàn + buffer giữ bàn.
      close_time: {
        type: DataTypes.STRING(8),
        allowNull: true,
        comment: 'Định dạng HH:MM',
      },
      // [HIỂN THỊ] Ảnh chi nhánh cho trang public/admin.
      image_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // [VỊ TRÍ] Tọa độ dùng tính chi nhánh gần khách.
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      // [VỊ TRÍ] Tọa độ dùng tính chi nhánh gần khách.
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      // [VẬN HÀNH] false = chi nhánh tạm ngưng, không cho đặt bàn.
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'branches',
      timestamps: false,
    }
  );

  return Branch;
};
