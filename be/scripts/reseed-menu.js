#!/usr/bin/env node
/**
 * SCRIPT RESEED MENU — seed lại toàn bộ menu_items cho các chi nhánh (ảnh + mô tả đa dạng).
 * Ctrl+F: reseed menu, buildMenuRowsForBranch, menu_items
 * Chạy: node scripts/reseed-menu.js
 * Hoặc: node scripts/reseed-menu.js --branch 1   (chỉ 1 chi nhánh)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../models/db');
const {
  buildMenuRowsForBranch,
} = require('../seeders/data/restaurantMenuCatalog');

async function getBranchIds(onlyBranch) {
  if (onlyBranch) return [Number(onlyBranch)];
  const rows = await db.sequelize.query(
    `SELECT branch_id FROM branches
     WHERE is_active IS DISTINCT FROM false
     ORDER BY branch_id`,
    { type: db.Sequelize.QueryTypes.SELECT }
  );
  const ids = rows.map((r) => Number(r.branch_id)).filter(Number.isFinite);
  return ids.length ? ids : [1];
}

async function clearMenuData(sequelize, branchIds) {
  const idList = branchIds.join(',');

  await sequelize.query('ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);', {
    raw: true,
  }).catch(() => {});

  await sequelize.query(
    `DELETE FROM order_items
     WHERE item_id IN (SELECT item_id FROM menu_items WHERE branch_id IN (${idList}))`,
    { raw: true }
  );

  await sequelize.query(`DELETE FROM menu_items WHERE branch_id IN (${idList})`, { raw: true });
}

async function resetMenuSequence(sequelize) {
  await sequelize.query(
    `SELECT setval(
      pg_get_serial_sequence('menu_items', 'item_id'),
      COALESCE((SELECT MAX(item_id) FROM menu_items), 1)
    )`,
    { raw: true }
  ).catch(() => {});
}

async function main() {
  const args = process.argv.slice(2);
  const branchFlag = args.indexOf('--branch');
  const onlyBranch =
    branchFlag >= 0 && args[branchFlag + 1] ? Number(args[branchFlag + 1]) : null;

  await db.sequelize.authenticate();
  const branchIds = await getBranchIds(onlyBranch);
  const now = new Date();

  console.log(`🍽  Reseed menu cho chi nhánh: ${branchIds.join(', ')}`);

  await clearMenuData(db.sequelize, branchIds);

  let total = 0;
  for (const branchId of branchIds) {
    const rows = buildMenuRowsForBranch(branchId, now);
    await db.MenuItem.bulkCreate(rows);
    total += rows.length;
    console.log(`   ✓ Chi nhánh ${branchId}: ${rows.length} món`);
  }

  await resetMenuSequence(db.sequelize);
  console.log(`✅ Xong — ${total} món (${branchIds.length} chi nhánh).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Reseed menu thất bại:', err.message);
  process.exit(1);
});
