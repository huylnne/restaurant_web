const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require("./User")(sequelize, DataTypes);
db.MenuItem = require("./MenuItem")(sequelize, DataTypes);
db.Table = require("./Table")(sequelize, DataTypes);
db.Reservation = require("./Reservation")(sequelize, DataTypes);

module.exports = db;
