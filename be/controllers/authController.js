const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const db = require("../models/db");      
const User = db.User;                


const login = async (req, res) => {
  try {
    // 1. Chuẩn hóa input
    const rawUsername = req.body.username || "";
    const username = rawUsername.trim().toLowerCase();
    const password = req.body.password;

    // 2. Tìm user theo username không phân biệt hoa thường
    const user = await User.findOne({
      where: { username: { [Op.iLike]: username } },
      // ⚠️ Bỏ attributes để trả toàn bộ
    });
    console.log('👀 user.user_id là:', user.user_id); // phải có giá trị
    console.log("🧪 user raw:", user);
console.log("🧪 user.user_id:", user.user_id);

    
    
    

    if (!user) {
      console.log("❌ Không tìm thấy user:", username);
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }

    // 3. So sánh mật khẩu thường
    if (user.password_hash !== password) {
      console.log("❌ Sai mật khẩu:", password, "!=", user.password_hash);
      return res.status(401).json({ message: "Sai mật khẩu" });
    }

    // 4. Tạo JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "2h" }
    );

    // 5. Trả về token và user info
    return res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        full_name: user.full_name,
      },
    });
  } catch (error) {
    console.error("🔥 Lỗi khi login:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = { login };
