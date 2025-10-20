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

db.sequelize.authenticate()
  .then(() => {
    console.log('✅ Kết nối DB thành công');
    return db.sequelize.sync({ alter: true }); 
  })
  .then(() => {
    console.log('✅ Sequelize đã sync models');
  })
  .catch((err) => {
    console.error('❌ Lỗi kết nối DB:', err);
  });

// ========== ROUTES ==========
// ✅ Đăng ký TẤT CẢ routes TRƯỚC khi app.listen()

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

// Upload routes
const uploadRoutes = require('./routes/user/upload');
app.use('/api/upload', uploadRoutes);

// Admin routes
const adminDashboardRoutes = require('./routes/admin/dashboard.routes');
app.use('/api/admin/dashboard', adminDashboardRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('✅ Backend API đang chạy!');
});

// ========== START SERVER ==========
// ✅ app.listen() phải ở CUỐI CÙNG
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});