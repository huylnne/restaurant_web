const userService = require("../../services/user.service");
const billService = require("../../services/bill.service");

//  Lấy profile
exports.getProfile = async (req, res) => {
  try {
    const profile = await userService.getProfile(req.userId);
    res.status(200).json(profile);
  } catch (err) {
    res.status(err.message === 'User không tồn tại' ? 404 : 500)
      .json({ message: err.message });
  }
};

//  Cập nhật profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.userId, req.body);
    res.json({ message: 'Cập nhật thành công', user });
  } catch (error) {
    res.status(error.message === 'User không tồn tại' ? 404 : 500)
      .json({ message: error.message });
  }
};

//  Đổi mật khẩu
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

//  Lấy lịch sử đặt bàn
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

//  Lấy bàn/đơn hiện tại của user (phiên đang dùng)
exports.getCurrentTableSession = async (req, res) => {
  try {
    const userId = req.userId;
    const session = await userService.getCurrentTableSession(userId);
    if (!session) {
      return res.status(404).json({ message: "Hiện tại bạn chưa có bàn đang sử dụng" });
    }
    res.status(200).json(session);
  } catch (err) {
    console.error("❌ Lỗi khi lấy bàn hiện tại:", err);
    res.status(500).json({ message: "Không thể lấy thông tin bàn hiện tại" });
  }
};

//  Hóa đơn tạm tính hiện tại của user (bao gồm mọi món từ user & waiter)
exports.getCurrentBill = async (req, res) => {
  try {
    const userId = req.userId;
    const bill = await billService.getBillForUser(userId);
    if (!bill) {
      return res.status(404).json({ message: "Hiện tại bạn chưa có bàn đang sử dụng" });
    }
    res.status(200).json(bill);
  } catch (err) {
    console.error("❌ Lỗi khi lấy bill hiện tại:", err);
    res.status(500).json({ message: "Không thể lấy hóa đơn tạm tính" });
  }
};

// UC13 - Gửi đánh giá dịch vụ
exports.createReview = async (req, res) => {
  try {
    const review = await userService.createReservationReview(req.userId, req.body);
    req.audit = {
      entityId: review.review_id,
      description: `Đánh giá order #${review.order_id}`,
      metadata: { rating: review.rating },
    };
    return res.status(201).json({
      message: "Gửi đánh giá thành công",
      review,
    });
  } catch (err) {
    const map = {
      ORDER_ID_INVALID: 400,
      RESERVATION_ID_INVALID: 400,
      RATING_INVALID: 400,
      COMMENT_TOO_SHORT: 400,
      COMMENT_TOO_LONG: 400,
      ORDER_NOT_FOUND: 404,
      RESERVATION_NOT_FOUND: 404,
      REVIEW_ALREADY_EXISTS: 409,
      REVIEW_NOT_ALLOWED: 400,
    };
    return res.status(map[err.message] || 500).json({
      message:
        err.message === "COMMENT_TOO_SHORT"
          ? "Nội dung đánh giá quá ngắn (tối thiểu 5 ký tự)"
          : err.message === "COMMENT_TOO_LONG"
          ? "Nội dung đánh giá quá dài (tối đa 1000 ký tự)"
          : err.message === "RATING_INVALID"
          ? "Vui lòng chọn số sao từ 1 đến 5"
          : err.message === "REVIEW_ALREADY_EXISTS"
          ? "Bạn đã đánh giá cho lượt đặt bàn này rồi"
          : err.message === "REVIEW_NOT_ALLOWED"
          ? "Chỉ có thể đánh giá sau khi hoàn tất hoặc đã thanh toán"
          : err.message === "RESERVATION_NOT_FOUND"
          ? "Không tìm thấy lượt đặt bàn hợp lệ"
          : "Không thể gửi đánh giá",
    });
  }
};