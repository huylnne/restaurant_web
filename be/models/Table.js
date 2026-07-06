/**
 * MODEL TABLE — bảng tables lưu bàn vật lý theo chi nhánh, sức chứa, trạng thái và QR token.
 * Ctrl+F: Table model, qr_token, table status, capacity
 * Luồng demo: bàn trống → đặt trước/occupied → cleaning → available.
 */
module.exports = (sequelize, DataTypes) => {

  const Table = sequelize.define(

    'Table',

    {

      table_id: {

        type: DataTypes.INTEGER,

        primaryKey: true,

        autoIncrement: true,

        allowNull: false,

      },

      // [CHI NHÁNH] Bàn thuộc một chi nhánh cụ thể.
      branch_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        references: { model: 'branches', key: 'branch_id' },

      },

      // [SƠ ĐỒ BÀN] Số bàn hiển thị và dùng để xét bàn liền kề khi ghép.
      table_number: {

        type: DataTypes.INTEGER,

        allowNull: false,

      },

      // [ĐẶT BÀN] Sức chứa để thuật toán chọn/ghép bàn.
      capacity: {

        type: DataTypes.INTEGER,

        allowNull: false,

      },

      // [TRẠNG THÁI BÀN] available/pre-ordered/occupied/cleaning.
      status: {

        type: DataTypes.STRING(15),

        allowNull: false,

        defaultValue: 'available',

        comment: 'available | pre-ordered | occupied | cleaning',

      },

      // [QR BÀN] Token public cho link /t/{token}, không dùng table_id trực tiếp.
      qr_token: {

        type: DataTypes.STRING(32),

        allowNull: true,

        unique: true,

        comment: '32 ký tự hex (16 bytes random)',

      },

      created_at: {

        type: DataTypes.DATE,

        allowNull: false,

        defaultValue: DataTypes.NOW,

      },

    },

    {

      tableName: 'tables',

      timestamps: false,

    }

  );



  // [QUAN HỆ] Một bàn có nhiều order theo thời gian; alias TableOrders dùng cho sơ đồ bàn.
  Table.associate = (models) => {

    Table.hasMany(models.Order, { foreignKey: 'table_id', as: 'TableOrders' });

  };



  return Table;

};

