module.exports = (sequelize, DataTypes) => {
  const Table = sequelize.define("Table", { 
    table_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    table_number: DataTypes.INTEGER,
    capacity: DataTypes.INTEGER,
    status: DataTypes.STRING,
    branch_id: DataTypes.INTEGER,
    created_at: DataTypes.DATE
  }, {
    tableName: 'tables',
    timestamps: false
  });

  Table.associate = (models) => {
    Table.hasMany(models.Reservation, { foreignKey: 'table_id' });
  };

  return Table;
};
