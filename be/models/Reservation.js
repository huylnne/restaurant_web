module.exports = (sequelize, DataTypes) => {
    const Reservation = sequelize.define("Reservation", {
      reservation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false   // ⬅️ ép phải có
      },
      
      branch_id: DataTypes.INTEGER,
      table_id: DataTypes.INTEGER,
      reservation_time: DataTypes.DATE,
      number_of_guests: DataTypes.INTEGER,
      status: DataTypes.STRING,
      created_at: DataTypes.DATE
    }, {
      tableName: 'reservations',
      timestamps: false
    });
  
    return Reservation;
  };
  
