require('dotenv').config();
const db = require('../models/db');
require('../models/index');

async function main() {
  await db.sequelize.authenticate();

  // Enable SQL logging temporarily
  db.sequelize.options.logging = (sql) => console.log('[SQL]', sql.substring(0, 300));

  const workShiftService = require('../services/admin/workShift.service');

  // Test branch 1, full date range
  console.log('\n=== Branch 1, 13-26 July ===');
  const r1 = await workShiftService.listWorkShifts(1, {
    startDate: '2026-07-13',
    endDate: '2026-07-26',
    page: 1,
    limit: 5,
  });
  console.log('total:', r1.total, '| first shift:', JSON.stringify(r1.shifts[0]));

  // Test branch 4
  console.log('\n=== Branch 4, 13-26 July ===');
  const r4 = await workShiftService.listWorkShifts(4, {
    startDate: '2026-07-13',
    endDate: '2026-07-26',
    page: 1,
    limit: 5,
  });
  console.log('total:', r4.total, '| first shift:', JSON.stringify(r4.shifts[0]));
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
