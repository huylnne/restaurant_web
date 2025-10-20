const userService = require("../../services/user.service");

// ✅ Lấy profile
exports.getProfile = async (req, res) => {
  try {
    const profile = await userService.getProfile(req.userId);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.message === 'User không tồn tại' ? 404 : 500)
      .json({ message: err.message });
  }
};

// ✅ Cập nhật profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.userId, req.body);
    res.json({ message: 'Cập nhật thành công', user });
  } catch (error) {
    res.status(error.message === 'User không tồn tại' ? 404 : 500)
      .json({ message: error.message });
  }
};

// ✅ Đổi mật khẩu
exports.changePassword = async (req, res) => {
  try {
    await userService.changePassword(
      req.userId,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(err.message === "Người dùng không tồn tại" ? 404 : 400)
      .json({ message: err.message });
  }
};

// ✅ Lấy lịch sử đặt bàn
exports.getReservationsWithOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const reservations = await userService.getReservationsWithOrders(userId);
    res.status(200).json(reservations);
  } catch (err) {
    console.error("❌ Lỗi khi lấy đặt bàn:", err);
    res.status(500).json({ message: "Không thể lấy lịch sử đặt bàn" });
  }
};