const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../../models/db");
const User = db.User;
const DEFAULT_AVATAR_URL = "https://tse3.mm.bing.net/th/id/OIP.aCwqDO1MIaS3qzA7DyFPdAHaHa?pid=Api&P=0&h=180";
const PHONE_REGEX = /^0\d{9}$/;

//  ĐĂNG KÝ
const register = async (req, res) => {
  try {
    const { username, password, full_name, phone, branch_id, role } = req.body;
    const normalizedPhone = String(phone || "").trim();

    // Chuẩn hóa username
    const normalizedUsername = username.trim().toLowerCase();

    // Kiểm tra username đã tồn tại
    const existingUser = await User.findOne({
      where: { username: { [Op.iLike]: normalizedUsername } }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({
        message: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0",
      });
    }

    // Kiểm tra SĐT đã được đăng ký bởi tài khoản khác chưa
    const existingPhone = await User.findOne({ where: { phone: normalizedPhone } });
    if (existingPhone) {
      return res.status(400).json({ message: "Số điện thoại này đã được đăng ký" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = await User.create({
      username: normalizedUsername,
      password_hash: hashedPassword,
      full_name,
      phone: normalizedPhone,
      avatar_url: DEFAULT_AVATAR_URL,
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

//  ĐĂNG NHẬP
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
        branch_id: user.branch_id || null,
      },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        branch_id: user.branch_id || null,
      },
    });
  } catch (error) {
    console.error(" Lỗi login:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Kiểm tra SĐT đã tồn tại chưa — dùng cho realtime check ở frontend
const checkPhone = async (req, res) => {
  try {
    const phone = String(req.query.phone || "").trim();
    if (!phone) return res.status(400).json({ message: "Thiếu số điện thoại" });
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({ message: "Số điện thoại này đã được đăng ký" });
    }
    return res.status(200).json({ available: true });
  } catch (error) {
    console.error("❌ Lỗi check-phone:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = { register, login, checkPhone };