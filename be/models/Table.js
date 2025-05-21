module.exports = (sequelize, DataTypes) => {
    const Table = sequelize.define("Table", {
      table_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      branch_id: DataTypes.INTEGER,
      table_number: DataTypes.INTEGER,
      capacity: DataTypes.INTEGER,
      status: DataTypes.STRING,
      created_at: DataTypes.DATE,
    }, {
      tableName: 'tables',
      timestamps: false
    });
  
    return Table;
  };
  