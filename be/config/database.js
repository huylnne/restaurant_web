// config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('restaurant_db', 'postgres', 'admin', {
  host: 'localhost',
  dialect: 'postgres',
});

module.exports = sequelize;
