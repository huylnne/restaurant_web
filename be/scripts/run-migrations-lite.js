require('dotenv').config();

const db = require('../models/db');

require('../models/index');



async function run() {

  await db.sequelize.authenticate();

  const q = (sql) => db.sequelize.query(sql, { raw: true }).catch(() => {});



  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id INTEGER;');

  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS note VARCHAR(200);');

  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMP;');

  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS number_of_guests INTEGER;');

  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2);');

  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(15) DEFAULT 'dine_in';`);

  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(16) DEFAULT 'unpaid';`);

  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS booking_group_id VARCHAR(36);');

  await q('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);');

  await q('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note VARCHAR(200);');

  await q(

    `UPDATE order_items oi

     SET price = COALESCE(

       CASE

         WHEN mi.sale_price IS NOT NULL AND mi.sale_price > 0 AND mi.sale_price < mi.price

         THEN mi.sale_price ELSE mi.price

       END, 0)

     FROM menu_items mi

     WHERE oi.item_id = mi.item_id AND oi.price IS NULL;`

  );

  await q('UPDATE order_items SET price = 0 WHERE price IS NULL;');

  await q(

    `UPDATE orders o

     SET branch_id = t.branch_id

     FROM tables t

     WHERE o.table_id = t.table_id AND o.branch_id IS NULL;`

  );

  await q(`UPDATE orders SET branch_id = 1 WHERE branch_id IS NULL;`);

  await q(

    `UPDATE users SET full_name = username WHERE full_name IS NULL OR TRIM(full_name) = '';`

  );

  await q('ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;');

  await q(`UPDATE menu_items SET is_available = COALESCE(is_active, true) WHERE is_available IS NULL;`);

  await q('ALTER TABLE menu_items DROP COLUMN IF EXISTS is_active;');

  await q('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id INTEGER;');
  await q(
    `UPDATE reviews rv SET order_id = rv.reservation_id
     WHERE rv.order_id IS NULL AND rv.reservation_id IS NOT NULL;`
  );
  await q('ALTER TABLE reviews DROP COLUMN IF EXISTS reservation_id;');

  await q(
    `UPDATE payments p SET order_id = p.reservation_id
     WHERE p.order_id IS NULL AND p.reservation_id IS NOT NULL;`
  );
  await q('ALTER TABLE payments DROP COLUMN IF EXISTS reservation_id;');
  await q('ALTER TABLE orders DROP COLUMN IF EXISTS reservation_id;');
  await q('DROP TABLE IF EXISTS reservations CASCADE;');

  console.log('Migrations OK');

}



run()

  .then(() => process.exit(0))

  .catch((e) => {

    console.error(e);

    process.exit(1);

  });

