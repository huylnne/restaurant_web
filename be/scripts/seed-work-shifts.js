/**
 * SCRIPT SEED WORK SHIFTS — chạy seeder ca làm việc không cần sequelize-cli config.
 * Ctrl+F: seed work shifts script
 * Chạy: node scripts/seed-work-shifts.js
 */
require('dotenv').config();

const db = require('../models/db');
require('../models/index');
const { applyMigrations } = require('./applyMigrations');
const seeder = require('../seeders/20260713100000-seed-work-shifts');

async function run() {
  await db.sequelize.authenticate();
  await applyMigrations(db.sequelize);
  await seeder.up(db.sequelize.getQueryInterface(), db.Sequelize);
  console.log('✅ Seed ca làm việc xong');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed ca làm việc thất bại:', err.message);
    process.exit(1);
  });
