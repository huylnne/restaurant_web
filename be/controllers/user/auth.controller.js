const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../../models/db");
const User = db.User;

// ✅ ĐĂNG KÝ
const register = async (req, res) => {
  try {
    const { username, password, full_name, phone, branch_id, role } = req.body;

    // Chuẩn hóa username
    const normalizedUsername = username.trim().toLowerCase();

    // Kiểm tra username đã tồn tại
    const existingUser = await User.findOne({
      where: { username: { [Op.iLike]: normalizedUsername } }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = await User.create({
      username: normalizedUsername,
      password_hash: hashedPassword,
      full_name,
      phone,
      branch_id: branch_id || 1,
      role: role || 'user'
    });

    res.status(201).json({
      message: 'Đăng ký thành công',
      user: {
        user_id: newUser.user_id,
        username: newUser.username,
        full_name: newUser.full_name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('❌ Lỗi register:', error);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// ✅ ĐĂNG NHẬP
const login = async (req, res) => {
  try {
    const rawUsername = req.body.username || "";
    const username = rawUsername.trim().toLowerCase();
    const password = req.body.password;

    // Tìm user
    const user = await User.findOne({
      where: { username: { [Op.iLike]: username } }
    });

    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }

    // Kiểm tra password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Sai mật khẩu" });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        full_name: user.full_name,
      },
    });
  } catch (error) {
    console.error("❌ Lỗi login:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = { register, login };