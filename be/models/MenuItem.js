module.exports = (sequelize, DataTypes) => {
  const MenuItem = sequelize.define("MenuItem", {
    item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: DataTypes.TEXT,
    price: DataTypes.DECIMAL(10, 2),
    category: DataTypes.STRING(100),
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    image_url: DataTypes.TEXT,
  }, {
    tableName: 'menu_items',
    timestamps: false
  });

  // 🔗 Quan hệ:
  MenuItem.associate = (models) => {
    MenuItem.hasMany(models.OrderItem, { foreignKey: 'item_id' });
  };

  return MenuItem;
};
