const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const path = require("path");
require('dotenv').config();

const { assertJwtSecretConfigured } = require('./utils/jwt');

// ========== MIDDLEWARE ==========
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========== DATABASE ==========
const db = require('./models/db');
require('./models/index');

async function initDatabase() {
  await db.sequelize.authenticate();
  console.log('✅ Kết nối DB thành công');

  if (process.env.DB_SYNC_ALTER === 'true') {
    await db.sequelize.sync({ alter: true });
    console.log('✅ Sequelize đã sync models (alter)');
  }

  // Migrations nhẹ — chạy mỗi lần start, bỏ qua nếu đã áp dụng
  await db.sequelize
    .query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(20);', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMP;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query("UPDATE tables SET status = 'pre-ordered' WHERE status = 'reserved';", { raw: true })
    .catch(() => {});

  // Order session columns (thay reservations)
  await db.sequelize
    .query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMP;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS number_of_guests INTEGER;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2);', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(15) DEFAULT 'dine_in';`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(16) DEFAULT 'unpaid';`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS booking_group_id VARCHAR(36);', { raw: true })
    .catch(() => {});

  // Migrate reservations → orders (nếu bảng cũ còn)
  await db.sequelize
    .query(
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
       );`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE orders o
       SET arrival_time = r.reservation_time,
           number_of_guests = COALESCE(o.number_of_guests, r.number_of_guests),
           booking_group_id = COALESCE(o.booking_group_id, r.booking_group_id),
           order_type = COALESCE(NULLIF(o.order_type, ''), 'reservation')
       FROM reservations r
       WHERE o.reservation_id = r.reservation_id;`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE orders SET arrival_time = created_at WHERE arrival_time IS NULL AND table_id IS NOT NULL;`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE orders SET order_type = 'dine_in'
       WHERE order_type IS NULL OR TRIM(order_type) = '';`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE orders SET payment_status = 'unpaid'
       WHERE payment_status IS NULL OR TRIM(payment_status) = '';`,
      { raw: true }
    )
    .catch(() => {});

  // Reviews: reservation_id → order_id
  await db.sequelize
    .query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id INTEGER;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE reviews rv
       SET order_id = rv.reservation_id
       WHERE rv.order_id IS NULL AND rv.reservation_id IS NOT NULL;`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE reviews DROP COLUMN IF EXISTS reservation_id;', { raw: true })
    .catch(() => {});

  // Payments: chỉ order_id
  await db.sequelize
    .query(
      `UPDATE payments p
       SET order_id = o.order_id
       FROM orders o
       WHERE p.order_id IS NULL
         AND p.reservation_id IS NOT NULL
         AND o.reservation_id = p.reservation_id;`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE payments p
       SET order_id = p.reservation_id
       WHERE p.order_id IS NULL AND p.reservation_id IS NOT NULL;`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE payments DROP COLUMN IF EXISTS reservation_id;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE orders DROP COLUMN IF EXISTS reservation_id;', { raw: true })
    .catch(() => {});
  await db.sequelize.query('DROP TABLE IF EXISTS reservations CASCADE;', { raw: true }).catch(() => {});

  // Chuẩn hóa orders.status legacy
  await db.sequelize
    .query(
      `UPDATE orders SET status = 'pre-ordered'
       WHERE status IN ('open', 'PENDING', 'pending', 'preorder');`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(`UPDATE orders SET status = 'in_progress' WHERE status = 'IN_PROGRESS';`, { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE orders SET status = 'completed' WHERE status IN ('COMPLETED');`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE orders SET status = 'cancelled' WHERE status IN ('CANCELLED');`,
      { raw: true }
    )
    .catch(() => {});

  await db.sequelize
    .query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE branches SET latitude = 21.0134, longitude = 105.7985
       WHERE branch_id = 1 AND (latitude IS NULL OR longitude IS NULL);`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE branches SET latitude = 10.7542, longitude = 106.669
       WHERE branch_id = 2 AND (latitude IS NULL OR longitude IS NULL);`,
      { raw: true }
    )
    .catch(() => {});

  await db.sequelize
    .query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      'CREATE INDEX IF NOT EXISTS orders_booking_group_id_idx ON orders(booking_group_id) WHERE booking_group_id IS NOT NULL;',
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE users ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('UPDATE users SET is_active = true WHERE is_active IS NULL;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('UPDATE users SET locked = false WHERE locked IS NULL;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);', {
      raw: true,
    })
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE menu_items
       SET sale_price = ROUND(price * 0.85, -3)
       WHERE is_featured = true
         AND COALESCE(is_available, is_active, true) = true
         AND sale_price IS NULL
         AND price > 0;`,
      { raw: true }
    )
    .catch(() => {});

  // Chuẩn hóa ràng buộc / cột mới — đồng bộ với thiết kế CSDL báo cáo
  await db.sequelize
    .query(`UPDATE users SET full_name = username WHERE full_name IS NULL OR TRIM(full_name) = '';`, {
      raw: true,
    })
    .catch(() => {});
  await db.sequelize
    .query(`UPDATE tables SET branch_id = 1 WHERE branch_id IS NULL;`, { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE orders o
       SET branch_id = t.branch_id
       FROM tables t
       WHERE o.table_id = t.table_id AND o.branch_id IS NULL;`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(`UPDATE orders SET branch_id = 1 WHERE branch_id IS NULL;`, { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(`UPDATE menu_items SET price = 0 WHERE price IS NULL;`, { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE menu_items SET category = 'Khác' WHERE category IS NULL OR TRIM(category) = '';`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;', {
      raw: true,
    })
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE menu_items SET is_available = COALESCE(is_active, true) WHERE is_available IS NULL;`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE menu_items DROP COLUMN IF EXISTS is_active;', { raw: true })
    .catch(() => {});

  await db.sequelize
    .query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id INTEGER;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS note VARCHAR(200);', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      `UPDATE orders o
       SET branch_id = t.branch_id
       FROM tables t
       WHERE o.table_id = t.table_id AND o.branch_id IS NULL;`,
      { raw: true }
    )
    .catch(() => {});

  await db.sequelize
    .query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);', {
      raw: true,
    })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note VARCHAR(200);', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
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
       WHERE oi.item_id = mi.item_id AND oi.price IS NULL;`,
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query(`UPDATE order_items SET price = 0 WHERE price IS NULL;`, { raw: true })
    .catch(() => {});

  const { ensureMenuForEmptyBranches } = require('./utils/ensureBranchMenus');
  await ensureMenuForEmptyBranches(db.sequelize).catch((err) => {
    console.warn('⚠️ ensureMenuForEmptyBranches:', err.message);
  });
}

// ========== ROUTES ==========
// Auth routes
const authRoutes = require('./routes/user/auth.routes');
app.use('/api/auth', authRoutes);

// User routes
const userRoutes = require('./routes/user/user.routes');
app.use('/api/users', userRoutes);

// Home routes
const homeRoutes = require('./routes/user/home.routes');
app.use('/api/home', homeRoutes);

// Menu routes
const menuRoutes = require('./routes/user/menu.routes');
app.use('/api/menu', menuRoutes);

const menuItemRoutes = require("./routes/user/menuItem.routes");
app.use("/api/menu-items", menuItemRoutes);

// Reservation routes
const reservationRoutes = require('./routes/user/reservation.routes');
app.use('/api/reservations', reservationRoutes);

// Order routes
const orderRoutes = require('./routes/user/order.routes');
app.use('/api/orders', orderRoutes);

// Payment routes
const paymentRoutes = require('./routes/user/payments.routes');
app.use('/api/payments', paymentRoutes);

// Public QR table routes
const publicTableRoutes = require("./routes/public/tables.routes");
app.use("/api/public/tables", publicTableRoutes);

// Upload routes
const uploadRoutes = require('./routes/user/upload');
app.use('/api/upload', uploadRoutes);

// Admin routes
const adminDashboardRoutes = require('./routes/admin/dashboard.routes');
app.use('/api/admin/dashboard', adminDashboardRoutes);

const adminTableRoutes = require('./routes/admin/table.routes')
app.use('/api/admin/table', adminTableRoutes);

// ✅ SỬA CHỖ NÀY: đổi từ /menu-items thành /menu
const adminMenuRoutes = require('./routes/admin/menu.routes');
app.use('/api/admin/menu', adminMenuRoutes);

const adminEmployeeRoutes = require('./routes/admin/employee.routes')
app.use('/api/admin/employees',adminEmployeeRoutes)

const adminUserAccountRoutes = require('./routes/admin/userAccount.routes');
app.use('/api/admin/users', adminUserAccountRoutes);

const adminReportRoutes = require('./routes/admin/report.routes')
app.use('/api/admin/reports',adminReportRoutes)

const adminReviewRoutes = require('./routes/admin/review.routes');
app.use('/api/admin/reviews', adminReviewRoutes);

const adminBranchRoutes = require('./routes/admin/branch.routes');
app.use('/api/admin/branches', adminBranchRoutes);

// ========== BỔ SUNG 2 ROUTE MỚI ==========
const kitchenRoutes = require('./routes/admin/kitchen.routes');
app.use('/api/admin/kitchen', kitchenRoutes);

const waiterRoutes = require('./routes/admin/waiter.routes');
app.use('/api/admin/waiter', waiterRoutes);

const receptionRoutes = require('./routes/admin/reception.routes');
app.use('/api/admin/reception', receptionRoutes);

const operationLogRoutes = require('./routes/admin/operationLog.routes');
app.use('/api/admin/operation-logs', operationLogRoutes);

app.get('/', (req, res) => {
  res.send(' Backend API đang chạy!');
});

// Body không phải JSON hợp lệ (hay gặp: curl/ghi trong PowerShell sai dấu nháy → body-parser lỗi)
app.use((err, req, res, next) => {
  const isJsonSyntax =
    err &&
    typeof err.message === 'string' &&
    (err.message.includes('JSON') || err.type === 'entity.parse.failed');

  if (err instanceof SyntaxError && isJsonSyntax) {
    return res.status(400).json({
      message:
        'Body không phải JSON hợp lệ. Dùng Content-Type: application/json, key và chuỗi bọc trong dấu nháy kép ("). Trên Windows nên POST từ file: curl -d @body.json hoặc Invoke-RestMethod + ConvertTo-Json.',
    });
  }
  return next(err);
});

const PORT = Number(process.env.PORT) || 3000;
const realtimeHub = require('./realtimeHub');
let server;

async function startServer() {
  try {
    assertJwtSecretConfigured();
    await initDatabase();
  } catch (err) {
    console.error('❌ Lỗi kết nối DB:', err.message || err);
    process.exit(1);
  }

  server = app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log('   Giữ terminal mở. Dừng server: Ctrl+C');
    realtimeHub.attachToHttpServer(server);
    console.log(`   WebSocket realtime: ws://localhost:${PORT}/ws/realtime`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} đã có process khác đang dùng.`);
      console.error('   Kiểm tra: Get-NetTCPConnection -LocalPort ' + PORT + ' | Select-Object OwningProcess');
      console.error('   Tắt process cũ: Stop-Process -Id <PID> -Force\n');
    } else {
      console.error('❌ Lỗi khởi động server:', err.message || err);
    }
    process.exit(1);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err);
});

process.on('SIGINT', () => {
  console.log('\n⏹ Đang tắt server...');
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

startServer();