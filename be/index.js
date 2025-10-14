const express = require('express');
const app = express();
const cors = require('cors');
const path = require("path");
require('dotenv').config();


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Backend');
});

const db = require('./models/db');

db.sequelize.authenticate()
  .then(() => {
    console.log('Kết nối DB thành công');
    return db.sequelize.sync({ alter: true }); 
  })
  .then(() => {
    console.log(' Sequelize đã sync models');
  })
  .catch((err) => {
    console.error(' Lỗi kết nối DB:', err);
  });


const menuRoutes = require('./routes/user/menu.routes');
app.use('/api/menu', menuRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const authRoutes = require('./routes/user/auth.routes');
app.use('/api/auth', authRoutes);


const homeRoutes = require('./routes/user/home.routes');
app.use('/api/home', homeRoutes);


const userRoutes = require('./routes/user/user.routes');
app.use('/api/users', userRoutes);

const menuItemRoutes = require("./routes/user/menuItem.routes");
app.use("/api/menu-items", menuItemRoutes);



app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const uploadRoutes = require('./routes/user/upload');
app.use('/api/upload', uploadRoutes);



const reservationRoutes = require('./routes/user/reservation.routes');
app.use('/api/reservations', reservationRoutes);

app.use('/api/orders', require('./routes/user/order.routes')); 

app.use('/api/payments', require('./routes/user/payments.routes')); 