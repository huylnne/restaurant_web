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

      branch_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        references: { model: 'branches', key: 'branch_id' },

      },

      name: {

        type: DataTypes.STRING(50),

        allowNull: false,

      },

      description: {

        type: DataTypes.TEXT,

        allowNull: true,

      },

      price: {

        type: DataTypes.DECIMAL(10, 2),

        allowNull: false,

      },

      sale_price: {

        type: DataTypes.DECIMAL(10, 2),

        allowNull: true,

      },

      category: {

        type: DataTypes.STRING(15),

        allowNull: false,

      },

      is_available: {

        type: DataTypes.BOOLEAN,

        allowNull: false,

        defaultValue: true,

      },

      is_featured: {

        type: DataTypes.BOOLEAN,

        allowNull: false,

        defaultValue: false,

      },

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



  MenuItem.associate = (models) => {

    MenuItem.hasMany(models.OrderItem, { foreignKey: 'item_id' });

  };



  return MenuItem;

};

