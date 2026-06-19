require('dotenv').config();
const db = require('../models/db');

async function run() {
  await db.sequelize.authenticate();
  const [tables] = await db.sequelize.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('reservations','orders') ORDER BY 1"
  );
  console.log('tables:', tables.map((t) => t.tablename));

  const [cols] = await db.sequelize.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='orders' ORDER BY ordinal_position"
  );
  console.log('orders cols:', cols.map((c) => c.column_name).join(', '));

  const [counts] = await db.sequelize.query(
    `SELECT
      (SELECT COUNT(*)::int FROM orders) AS orders,
      (SELECT COUNT(*)::int FROM order_items) AS items,
      (SELECT COUNT(*)::int FROM orders WHERE order_type='reservation') AS bookings`
  );
  console.log('counts:', counts[0]);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
