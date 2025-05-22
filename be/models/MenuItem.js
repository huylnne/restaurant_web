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
        description: {
          type: DataTypes.TEXT,
        },
        price: {
          type: DataTypes.DECIMAL(10, 2),
        },
        category: {
          type: DataTypes.STRING(100),
        },
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
        image_url: {
          type: DataTypes.TEXT,
        },
        
      }, {
        tableName: 'menu_items',     // ✅ phải nằm ở object thứ 2
        timestamps: false
      });
      
  
    return MenuItem;
  };
  
