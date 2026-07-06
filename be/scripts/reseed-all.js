/**
 * SCRIPT RESEED ALL — undo toàn bộ seeders rồi chạy lại theo thứ tự phụ thuộc đúng.
 * Ctrl+F: reseed all, SEEDERS, chạy lại dữ liệu demo
 * Chạy: node scripts/reseed-all.js
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

/**
 * Menu phải seed xong TRƯỚC demo orders.
 * Không chạy reseed-menu sau demo-data (nó DELETE order_items).
 */
const SEEDERS = [
  '20260423090000-seed-branches.js',
  '20250519125942-demo-users.js',
  '20260601120000-reseed-menu-items.js',
  '20260519100000-seed-seven-branches-staff.js',
  '20250519131911-demo-reservations.js',
  '20250105-seed-employees.js',
  '20260423092000-seed-extra-users.js',
  '20260423092500-seed-extra-employees-branch2.js',
  '20260331-seed-demo-data.js',
  '20260331-seed-today.js',
  '20260423093500-seed-branch2-demo-data.js',
  '20260615000000-seed-bulk-data.js',
];

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

console.log('▶ Chạy migration nhẹ...');
run('node scripts/run-migrations-lite.js');

console.log('▶ Undo tất cả seeders...');
run('npx sequelize-cli db:seed:undo:all --env development');

console.log('▶ Seed lại theo thứ tự...');
for (const file of SEEDERS) {
  console.log(`   → ${file}`);
  run(`npx sequelize-cli db:seed --seed ${file} --env development`);
}

console.log('✅ Reseed hoàn tất');
