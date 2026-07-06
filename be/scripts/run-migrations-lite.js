/**
 * SCRIPT RUN MIGRATIONS LITE — CLI chạy applyMigrations ngoài lúc start server.
 * Ctrl+F: run migrations lite, npm run migrate, Migrations OK
 * Dùng khi cần cập nhật schema thủ công trước demo.
 */
require('dotenv').config();

const db = require('../models/db');
require('../models/index');
const { applyMigrations } = require('./applyMigrations');

async function run() {
  await db.sequelize.authenticate();
  await applyMigrations(db.sequelize);
  console.log('Migrations OK');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
