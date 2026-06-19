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

      branch_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        references: { model: 'branches', key: 'branch_id' },

      },

      table_number: {

        type: DataTypes.INTEGER,

        allowNull: false,

      },

      capacity: {

        type: DataTypes.INTEGER,

        allowNull: false,

      },

      status: {

        type: DataTypes.STRING(15),

        allowNull: false,

        defaultValue: 'available',

        comment: 'available | pre-ordered | occupied | cleaning',

      },

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



  Table.associate = (models) => {

    Table.hasMany(models.Order, { foreignKey: 'table_id', as: 'TableOrders' });

  };



  return Table;

};

