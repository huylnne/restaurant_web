/**
 * MODEL MENU ITEM — bảng menu_items lưu món ăn riêng theo từng chi nhánh.
 * Ctrl+F: MenuItem model, menu_items, sale_price, is_available, is_featured
 * Luồng demo: khách xem menu theo chi nhánh, admin quản lý món ăn.
 */
module.exports = (sequelize, DataTypes) => {

  const MenuItem = sequelize.define(

    'MenuItem',

    {

      item_id: {

        type: DataTypes.INTEGER,

        primaryKey: true,

        autoIncrement: true,

        allowNull: false,

      },

      // [CHI NHÁNH] Mỗi chi nhánh có bản menu riêng.
      branch_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        references: { model: 'branches', key: 'branch_id' },

      },

      // [THỰC ĐƠN] Tên món hiển thị cho khách/bếp/bill.
      name: {

        type: DataTypes.STRING(50),

        allowNull: false,

      },

      // [THỰC ĐƠN] Mô tả món.
      description: {

        type: DataTypes.TEXT,

        allowNull: true,

      },

      // [GIÁ] Giá gốc của món.
      price: {

        type: DataTypes.DECIMAL(10, 2),

        allowNull: false,

      },

      // [KHUYẾN MÃI] Giá sale nếu hợp lệ sẽ được dùng khi gọi món/tính bill.
      sale_price: {

        type: DataTypes.DECIMAL(10, 2),

        allowNull: true,

      },

      // [DANH MỤC] Khai vị/món chính/đồ uống... để filter menu.
      category: {

        type: DataTypes.STRING(15),

        allowNull: false,

      },

      // [TRẠNG THÁI BÁN] false = hết hàng/ngưng bán.
      is_available: {

        type: DataTypes.BOOLEAN,

        allowNull: false,

        defaultValue: true,

      },

      // [TRANG CHỦ] true = món nổi bật/highlight.
      is_featured: {

        type: DataTypes.BOOLEAN,

        allowNull: false,

        defaultValue: false,

      },

      // [HIỂN THỊ] Ảnh món.
      image_url: {

        type: DataTypes.TEXT,

        allowNull: true,

      },

      created_at: {

        type: DataTypes.DATE,

        allowNull: false,

        defaultValue: DataTypes.NOW,

      },

    },

    {

      tableName: 'menu_items',

      timestamps: false,

    }

  );



  // [QUAN HỆ] Một món có thể xuất hiện ở nhiều OrderItem.
  MenuItem.associate = (models) => {

    MenuItem.hasMany(models.OrderItem, { foreignKey: 'item_id' });

  };



  return MenuItem;

};

