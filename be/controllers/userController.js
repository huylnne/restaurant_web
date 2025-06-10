const db = require("../models/db"); // hoặc ../models nếu bạn dùng index.js trong models/
const User = db.User;


exports.registerUser = async (req, res) => {
  try {
    const { username, password, role, full_name, phone, avatar_url } = req.body;

    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ message: "Username đã tồn tại" });

    const newUser = await User.create({
      username,
      password_hash: password,
      role,
      full_name,
      phone,
      avatar_url,
    });

    res.status(201).json({ message: "Đăng ký thành công", user: newUser });
  } catch (error) {
    console.error("Lỗi khi đăng ký:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// GET /api/users/me
exports.getProfile = async (req, res) => {
  try {


    const user = await User.findByPk(req.userId, {
      attributes: ['full_name', 'avatar_url','phone']
    });



    if (!user) {

      return res.status(404).json({ message: 'User không tồn tại' });
    }
    return res.status(200).json({
      name: user.full_name,
      avatar: user.avatar_url,
      phone:user.phone
    });

  } catch (err) {
    console.error('Lỗi lấy profile:', err);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body
    const user = await User.findByPk(req.userId)

    if (!user) return res.status(404).json({ message: 'User không tồn tại' })

    user.full_name = full_name ?? user.full_name
    user.phone = phone ?? user.phone
    user.avatar_url = avatar_url ?? user.avatar_url

    await user.save()
    res.json({ message: 'Cập nhật thành công', user })
  } catch (error) {
    console.error('Lỗi cập nhật:', error)
    res.status(500).json({ message: 'Lỗi server' })
  }
}

exports.changePassword = async (req, res) => {
  

  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;
    

    const user = await db.User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });
   
    if (user.password_hash !== currentPassword) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }
    
    user.password_hash = newPassword;
    await user.save();
    

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error("🔥 Lỗi đổi mật khẩu:", err);
    res.status(500).json({ message: "Đổi mật khẩu thất bại" });
  }
};




