const User = require('../models/User')

exports.registerUser = async (req, res) => {
  try {
    const { username, password, role, full_name, phone } = req.body;

    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ message: "Username đã tồn tại" });

    const newUser = await User.create({
      username,
      password_hash: password,
      role,
      full_name,
      phone,
    });

    res.status(201).json({ message: "Đăng ký thành công", user: newUser });
  } catch (error) {
    console.error("Lỗi khi đăng ký:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
