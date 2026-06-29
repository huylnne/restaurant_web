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
