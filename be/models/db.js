/**
 * DB CONNECTION — khởi tạo Sequelize PostgreSQL và import toàn bộ model.
 * Ctrl+F: db connection, sequelize, DATABASE_URL, import models
 * Dùng bởi: controllers/services require("../models") hoặc require("../models/db").
 */
const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

// [DATABASE] Kết nối PostgreSQL bằng DATABASE_URL; production bật SSL.
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === "production"
      ? {
          require: true,
          rejectUnauthorized: false,
        }
      : false,
  },
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// [MODELS] Import model Sequelize theo bảng nghiệp vụ.
db.User = require("./User")(sequelize, DataTypes);
db.Branch = require("./Branch")(sequelize, DataTypes);
db.MenuItem = require("./MenuItem")(sequelize, DataTypes);
db.Table = require("./Table")(sequelize, DataTypes);
db.Order = require('./Order')(sequelize, Sequelize.DataTypes);
db.OrderTable = require("./OrderTable")(sequelize, DataTypes);
db.OrderItem = require('./OrderItem')(sequelize, Sequelize.DataTypes);
db.Employee = require("./Employee")(sequelize, DataTypes);
db.WorkShift = require("./WorkShift")(sequelize, DataTypes);
db.Payment = require("./Payment")(sequelize, DataTypes);
db.Review = require("./Review")(sequelize, DataTypes);
db.OperationLog = require("./OperationLog")(sequelize, DataTypes);
module.exports = db;
