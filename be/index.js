const express = require('express');
const app = express();
const cors = require('cors');
const path = require("path");
require('dotenv').config();

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json());
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
    .query('ALTER TABLE payments ALTER COLUMN order_id DROP NOT NULL;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS reservation_id INTEGER;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(60);', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMP;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query(
      'CREATE UNIQUE INDEX IF NOT EXISTS payments_reservation_id_uq ON payments(reservation_id) WHERE reservation_id IS NOT NULL;',
      { raw: true }
    )
    .catch(() => {});
  await db.sequelize
    .query('ALTER TABLE orders ALTER COLUMN reservation_id DROP NOT NULL;', { raw: true })
    .catch(() => {});
  await db.sequelize
    .query("UPDATE tables SET status = 'pre-ordered' WHERE status = 'reserved';", { raw: true })
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