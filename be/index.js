const express = require('express');
const app = express();
const cors = require('cors');
const uploadRoute = require("./routes/upload");
const path = require("path");
require('dotenv').config();


app.use(cors());
app.use(express.json());

// Sample route
app.get('/', (req, res) => {
  res.send('Hello from Backend');
});

const db = require('./models/db');

db.sequelize.authenticate()
  .then(() => {
    console.log('✅ Kết nối DB thành công');
    return db.sequelize.sync({ alter: true }); // ⬅ Thêm dòng này
  })
  .then(() => {
    console.log('✅ Sequelize đã sync models');
  })
  .catch((err) => {
    console.error('❌ Lỗi kết nối DB:', err);
  });


const menuRoutes = require('./routes/menuRoutes');
app.use('/api/menu', menuRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);


const homeRoutes = require('./routes/home');
app.use('/api/home', homeRoutes);


const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const menuItemRoutes = require("./routes/menuItem.routes");
app.use("/api/menu-items", menuItemRoutes);



app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Dùng route upload
app.use("/api/upload", uploadRoute);

const reservationRoutes = require('./routes/reservationRoutes');
app.use('/api/reservations', reservationRoutes);
