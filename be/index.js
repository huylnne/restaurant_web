/**
 * BACKEND ENTRYPOINT — khởi động Express API, mount routes, WebSocket realtime, quét no-show.
 * Ctrl+F: backend entrypoint, startServer, runReservationExpirySweep, /api/admin/waiter
 * Luồng demo: chạy `npm run dev`, REST API + WebSocket phục vụ toàn bộ vòng đặt bàn/bếp/thanh toán.
 */
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const path = require("path");
require('dotenv').config();

const { assertJwtSecretConfigured } = require('./utils/jwt');

// ========== MIDDLEWARE ==========
app.use(helmet()); // set các HTTP header bảo mật (chống XSS, clickjacking...)
app.use(cors()); // cho phép frontend khác origin gọi API
app.use(express.json({ limit: '100kb' })); // parse body JSON, giới hạn 100kb chống payload quá lớn
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // phục vụ ảnh đã upload dưới dạng file tĩnh

// ========== DATABASE ==========
const db = require('./models/db');
require('./models/index');

/** [KHỞI ĐỘNG] Authenticate DB, optionally sync alter, rồi apply migrations. Ctrl+F: initDatabase */
async function initDatabase() {
  await db.sequelize.authenticate();
  console.log('✅ Kết nối DB thành công');

  if (process.env.DB_SYNC_ALTER === 'true') {
    await db.sequelize.sync({ alter: true });
    console.log('✅ Sequelize đã sync models (alter)');
  }

  const { applyMigrations } = require('./scripts/applyMigrations');
  await applyMigrations(db.sequelize);
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
let reservationExpiryTimer;
let reservationExpiryRunning = false;

const RESERVATION_EXPIRY_SWEEP_MS = 60 * 1000;

/** [NO-SHOW] Quét định kỳ đặt bàn quá grace 15 phút để no_show/giải phóng bàn/khóa khách. Ctrl+F: runReservationExpirySweep */
async function runReservationExpirySweep(source = 'timer') {
  // Cờ chống chạy chồng: nếu lần quét trước chưa xong thì bỏ qua lần này (tránh xử lý trùng).
  if (reservationExpiryRunning) return;
  reservationExpiryRunning = true;

  try {
    const tableSummaryService = require('./services/admin/tableSummary.service');
    // Quét lần lượt từng chi nhánh đang hoạt động, giải phóng bàn/đánh dấu no-show cho đơn quá giờ.
    const branches = await db.Branch.findAll({
      attributes: ['branch_id'],
      where: { is_active: true },
    });

    for (const branch of branches) {
      await tableSummaryService.expireReservationsForBranch(branch.branch_id);
    }
  } catch (err) {
    console.error(`❌ Lỗi quét no-show đặt bàn (${source}):`, err.message || err);
  } finally {
    reservationExpiryRunning = false;
  }
}

/** [NO-SHOW] Scheduler chạy mỗi 60s sau khi server start. Ctrl+F: startReservationExpiryScheduler */
function startReservationExpiryScheduler() {
  if (reservationExpiryTimer) return;

  runReservationExpirySweep('startup');
  reservationExpiryTimer = setInterval(
    () => runReservationExpirySweep('timer'),
    RESERVATION_EXPIRY_SWEEP_MS
  );
}

/** [KHỞI ĐỘNG] Validate JWT_SECRET, init DB, listen PORT, attach WebSocket. Ctrl+F: startServer */
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
    startReservationExpiryScheduler();
    console.log('   Tự động quét đặt bàn no-show mỗi 60 giây');
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
  if (reservationExpiryTimer) {
    clearInterval(reservationExpiryTimer);
  }
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

startServer();