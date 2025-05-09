const pool = require('../models/db');
// const bcrypt = require('bcrypt');  // Tạm không cần nếu bỏ mã hóa
const jwt = require('jsonwebtoken');


const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'Tài khoản không tồn tại' });

    const user = result.rows[0];

    // So sánh mật khẩu thường
    if (password !== user.password_hash) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token, user: { username: user.username, role: user.role, full_name: user.full_name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// bcrypt.hash("123456", 10).then(console.log); // Không cần nữa

module.exports = { login };
