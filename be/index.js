const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();


app.use(cors());
app.use(express.json());

// Sample route
app.get('/', (req, res) => {
  res.send('Hello from Backend');
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
