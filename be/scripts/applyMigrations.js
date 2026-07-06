/**
 * SCRIPT APPLY MIGRATIONS — migrations nhẹ/idempotent cho schema runtime.
 * Ctrl+F: apply migrations, idempotent migration, expected_end_time, order_tables
 * Chạy tự động từ index.js hoặc qua npm run migrate.
 * Bỏ qua lỗi từng câu lệnh (đã áp dụng / không áp dụng được).
 */
async function applyMigrations(sequelize) {
  const q = (sql) => sequelize.query(sql, { raw: true }).catch(() => {});

  await q('ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(20);');
  await q('ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMP;');
  await q("UPDATE tables SET status = 'pre-ordered' WHERE status = 'reserved';");

  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMP;');
  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS number_of_guests INTEGER;');
  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2);');
  await q(
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(15) DEFAULT 'dine_in';`
  );
  await q(
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(16) DEFAULT 'unpaid';`
  );
  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS booking_group_id VARCHAR(36);');
  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;');
  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_end_time TIMESTAMP;');
  await q(
    `UPDATE orders
     SET expected_end_time = COALESCE(expected_end_time, arrival_time + interval '2 hour')
     WHERE arrival_time IS NOT NULL;`
  );
  await q(
    `UPDATE orders
     SET checked_in_at = COALESCE(checked_in_at, arrival_time, created_at)
     WHERE checked_in_at IS NULL
       AND order_type IN ('walk_in', 'dine_in')
       AND status IN ('pre-ordered', 'in_progress', 'waiting_payment');`
  );
  await q(
    `UPDATE orders
     SET status = 'confirmed'
     WHERE order_type = 'reservation'
       AND checked_in_at IS NULL
       AND status = 'pre-ordered';`
  );

  await q(
    `INSERT INTO orders (
       user_id, branch_id, table_id, arrival_time, number_of_guests, status, note,
       order_type, payment_status, booking_group_id, created_at
     )
     SELECT
       r.user_id, r.branch_id, r.table_id, r.reservation_time, r.number_of_guests, r.status, r.note,
       'reservation', 'unpaid', r.booking_group_id, r.created_at
     FROM reservations r
     WHERE NOT EXISTS (
       SELECT 1 FROM orders o WHERE o.order_id = r.reservation_id
     );`
  );
  await q(
    `UPDATE orders o
     SET arrival_time = r.reservation_time,
         number_of_guests = COALESCE(o.number_of_guests, r.number_of_guests),
         booking_group_id = COALESCE(o.booking_group_id, r.booking_group_id),
         order_type = COALESCE(NULLIF(o.order_type, ''), 'reservation')
     FROM reservations r
     WHERE o.reservation_id = r.reservation_id;`
  );
  await q(
    `UPDATE orders SET arrival_time = created_at WHERE arrival_time IS NULL AND table_id IS NOT NULL;`
  );
  await q(
    `UPDATE orders SET order_type = 'dine_in'
     WHERE order_type IS NULL OR TRIM(order_type) = '';`
  );
  await q(
    `UPDATE orders SET payment_status = 'unpaid'
     WHERE payment_status IS NULL OR TRIM(payment_status) = '';`
  );

  await q('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id INTEGER;');
  await q(
    `UPDATE reviews rv
     SET order_id = rv.reservation_id
     WHERE rv.order_id IS NULL AND rv.reservation_id IS NOT NULL;`
  );
  await q('ALTER TABLE reviews DROP COLUMN IF EXISTS reservation_id;');
  await q('ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;');

  await q(
    `UPDATE payments p
     SET order_id = o.order_id
     FROM orders o
     WHERE p.order_id IS NULL
       AND p.reservation_id IS NOT NULL
       AND o.reservation_id = p.reservation_id;`
  );
  await q(
    `UPDATE payments p
     SET order_id = p.reservation_id
     WHERE p.order_id IS NULL AND p.reservation_id IS NOT NULL;`
  );
  await q('ALTER TABLE payments DROP COLUMN IF EXISTS reservation_id;');
  await q('ALTER TABLE orders DROP COLUMN IF EXISTS reservation_id;');
  await q('DROP TABLE IF EXISTS reservations CASCADE;');

  await q(
    `UPDATE orders SET status = 'pre-ordered'
     WHERE status IN ('open', 'preorder')
        OR (status IN ('PENDING', 'pending') AND order_type != 'reservation');`
  );
  await q(
    `UPDATE orders SET status = 'confirmed'
     WHERE order_type = 'reservation'
       AND checked_in_at IS NULL
       AND status IN ('pending', 'PENDING', 'pre-ordered');`
  );
  await q(`UPDATE orders SET status = 'in_progress' WHERE status = 'IN_PROGRESS';`);
  await q(`UPDATE orders SET status = 'completed' WHERE status IN ('COMPLETED');`);
  await q(`UPDATE orders SET status = 'cancelled' WHERE status IN ('CANCELLED');`);

  await q(
    `UPDATE branches SET open_time = '08:00' WHERE open_time IS NULL OR TRIM(open_time) = '' OR open_time = '09:00';`
  );
  await q(
    `UPDATE branches SET close_time = '22:00' WHERE close_time IS NULL OR TRIM(close_time) = '';`
  );
  await q('ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);');
  await q('ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);');
  await q(
    `UPDATE branches SET latitude = 21.0134, longitude = 105.7985
     WHERE branch_id = 1 AND (latitude IS NULL OR longitude IS NULL);`
  );
  await q(
    `UPDATE branches SET latitude = 10.7542, longitude = 106.669
     WHERE branch_id = 2 AND (latitude IS NULL OR longitude IS NULL);`
  );

  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;');
  await q(
    'CREATE INDEX IF NOT EXISTS orders_booking_group_id_idx ON orders(booking_group_id) WHERE booking_group_id IS NOT NULL;'
  );
  await q(
    `CREATE TABLE IF NOT EXISTS order_tables (
       order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
       table_id INTEGER NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
       is_primary BOOLEAN NOT NULL DEFAULT false,
       PRIMARY KEY (order_id, table_id)
     );`
  );
  await q('CREATE INDEX IF NOT EXISTS order_tables_table_id_idx ON order_tables(table_id);');
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;');
  await q('UPDATE users SET is_active = true WHERE is_active IS NULL;');
  await q('UPDATE users SET locked = false WHERE locked IS NULL;');
  await q('ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);');
  await q(
    `UPDATE menu_items
     SET sale_price = ROUND(price * 0.85, -3)
     WHERE is_featured = true
       AND COALESCE(is_available, is_active, true) = true
       AND sale_price IS NULL
       AND price > 0;`
  );

  await q(
    `UPDATE users SET full_name = username WHERE full_name IS NULL OR TRIM(full_name) = '';`
  );
  await q(`UPDATE tables SET branch_id = 1 WHERE branch_id IS NULL;`);
  await q(
    `UPDATE orders o
     SET branch_id = t.branch_id
     FROM tables t
     WHERE o.table_id = t.table_id AND o.branch_id IS NULL;`
  );
  await q(`UPDATE orders SET branch_id = 1 WHERE branch_id IS NULL;`);
  await q(`UPDATE menu_items SET price = 0 WHERE price IS NULL;`);
  await q(
    `UPDATE menu_items SET category = 'Khác' WHERE category IS NULL OR TRIM(category) = '';`
  );
  await q('ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;');
  await q(
    `UPDATE menu_items SET is_available = COALESCE(is_active, true) WHERE is_available IS NULL;`
  );
  await q('ALTER TABLE menu_items DROP COLUMN IF EXISTS is_active;');

  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id INTEGER;');
  await q('ALTER TABLE orders ADD COLUMN IF NOT EXISTS note VARCHAR(200);');
  await q(
    `UPDATE orders o
     SET branch_id = t.branch_id
     FROM tables t
     WHERE o.table_id = t.table_id AND o.branch_id IS NULL;`
  );

  await q('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);');
  await q('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note VARCHAR(200);');
  await q(
    `UPDATE order_items oi
     SET price = COALESCE(
       CASE
         WHEN mi.sale_price IS NOT NULL AND mi.sale_price > 0 AND mi.sale_price < mi.price
         THEN mi.sale_price
         ELSE mi.price
       END,
       0
     )
     FROM menu_items mi
     WHERE oi.item_id = mi.item_id AND oi.price IS NULL;`
  );
  await q(`UPDATE order_items SET price = 0 WHERE price IS NULL;`);
  await q('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMP;');
  await q(
    `UPDATE order_items oi
     SET ordered_at = o.created_at
     FROM orders o
     WHERE oi.order_id = o.order_id AND oi.ordered_at IS NULL;`
  );

  const { ensureMenuForEmptyBranches } = require('../utils/ensureBranchMenus');
  await ensureMenuForEmptyBranches(sequelize).catch((err) => {
    console.warn('⚠️ ensureMenuForEmptyBranches:', err.message);
  });
}

module.exports = { applyMigrations };
