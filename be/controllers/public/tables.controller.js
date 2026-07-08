/**
 * CONTROLLER QR BÀN (PUBLIC) — HTTP cho /t/{token}: bill, gọi món, đánh giá.
 * Ctrl+F: QR controller, public tables, /t/
 */
const service = require("../../services/public/tableQr.service");

/** [QR] GET — thông tin bàn + can_order. Ctrl+F: getTableByToken */
exports.getTableByToken = async (req, res) => {
  try {
    const table = await service.getTableByToken(req.params.token);
    if (!table) return res.status(404).json({ message: "Không tìm thấy bàn" });
    res.json(table);
  } catch (e) {
    console.error("getTableByToken error:", e);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/** [QR] GET — bill tạm tính không đăng nhập. Ctrl+F: getBillByToken */
exports.getBillByToken = async (req, res) => {
  try {
    const bill = await service.getBillByToken(req.params.token);
    if (!bill) return res.status(404).json({ message: "Không có bill cho bàn này" });
    res.json(bill);
  } catch (e) {
    console.error("getBillByToken error:", e);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/** [QR] POST — check-in qua QR (luồng phụ). Ctrl+F: checkinByToken */
exports.checkinByToken = async (req, res) => {
  try {
    const userId = req.userId;
    const { number_of_guests } = req.body || {};
    const data = await service.checkinByToken({
      token: req.params.token,
      userId,
      numberOfGuests: number_of_guests,
    });
    req.audit = {
      entityId: data?.order_id ?? data?.order?.order_id,
      description: `Check-in QR bàn`,
      metadata: { table_id: data?.order?.table_id ?? data?.table_id },
    };
    res.status(201).json(data);
  } catch (e) {
    const map = {
      TABLE_NOT_FOUND: 404,
      TABLE_NOT_ACTIVE: 400,
      INVALID_GUESTS: 400,
    };
    res.status(map[e.message] || 500).json({ message: e.message });
  }
};

/** [QR] POST — khách gọi món qua QR. Ctrl+F: addOrderItemsByToken */
exports.addOrderItemsByToken = async (req, res) => {
  try {
    // token (trên URL) định danh bàn; accessToken (header x-table-order-token) chứng minh khách đang trong phiên hợp lệ.
    const data = await service.addOrderItemsByToken({
      token: req.params.token,
      accessToken: req.headers["x-table-order-token"],
      items: req.body?.items,
      note: req.body?.note,
    });
    req.audit = {
      entityId: data?.order_id,
      description: "Khách gọi món qua QR bàn",
      metadata: { table_id: data?.table_id, item_count: data?.item_count },
    };
    res.status(201).json(data);
  } catch (e) {
    const map = {
      TABLE_NOT_FOUND: 404,
      TABLE_CLEANING: 400,
      TABLE_NOT_ACTIVE: 400,
      NO_ACTIVE_SESSION: 400,
      ORDER_ACCESS_REQUIRED: 401,
      ORDER_ACCESS_INVALID: 403,
      INVALID_ITEMS: 400,
    };
    const messageMap = {
      TABLE_CLEANING: "Bàn đang chờ dọn, chưa thể gọi món.",
      TABLE_NOT_ACTIVE: "Bàn chưa mở phiên phục vụ. Vui lòng đợi nhân viên tiếp nhận.",
      NO_ACTIVE_SESSION: "Phiên phục vụ đã kết thúc. Không thể gọi thêm món.",
      ORDER_ACCESS_REQUIRED: "Phiên gọi món không hợp lệ. Vui lòng tải lại trang.",
      ORDER_ACCESS_INVALID: "Phiên gọi món đã hết hạn. Vui lòng tải lại trang.",
      INVALID_ITEMS: "Danh sách món không hợp lệ.",
    };
    res.status(map[e.message] || 500).json({
      message: messageMap[e.message] || e.message || "Lỗi server",
    });
  }
};

/** [QR] GET — kiểm tra được phép đánh giá chưa. Ctrl+F: getReviewEligibility */
exports.getReviewEligibility = async (req, res) => {
  try {
    const orderId = req.query.order_id ? Number(req.query.order_id) : null;
    const data = await service.getReviewEligibilityByToken(req.params.token, orderId);
    if (!data) return res.status(404).json({ message: "Không tìm thấy bàn" });
    res.json(data);
  } catch (e) {
    console.error("getReviewEligibility error:", e);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const reviewErrorMessage = (err) => {
  const map = {
    ORDER_ID_INVALID: "Mã đơn không hợp lệ",
    RATING_INVALID: "Vui lòng chọn số sao từ 1 đến 5",
    COMMENT_TOO_SHORT: "Nội dung đánh giá quá ngắn (tối thiểu 5 ký tự)",
    COMMENT_TOO_LONG: "Nội dung đánh giá quá dài (tối đa 1000 ký tự)",
    ORDER_NOT_FOUND: "Không tìm thấy đơn hàng hợp lệ",
    REVIEW_ALREADY_EXISTS: "Bạn đã đánh giá cho lượt phục vụ này rồi",
    REVIEW_NOT_ALLOWED: "Chỉ có thể đánh giá sau khi đã thanh toán",
  };
  return map[err.message] || "Không thể gửi đánh giá";
};

/** [QR] POST — gửi đánh giá qua token. Ctrl+F: createReviewByToken */
exports.createReviewByToken = async (req, res) => {
  try {
    const review = await service.createReviewByToken({
      token: req.params.token,
      order_id: req.body?.order_id,
      rating: req.body?.rating,
      comment: req.body?.comment,
    });
    req.audit = {
      entityId: review.review_id,
      description: `Khách QR đánh giá order #${review.order_id}`,
      metadata: { rating: review.rating, tableToken: req.params.token },
    };
    res.status(201).json({ message: "Gửi đánh giá thành công", review });
  } catch (e) {
    const map = {
      TABLE_NOT_FOUND: 404,
      ORDER_ID_INVALID: 400,
      RATING_INVALID: 400,
      COMMENT_TOO_SHORT: 400,
      COMMENT_TOO_LONG: 400,
      ORDER_NOT_FOUND: 404,
      REVIEW_ALREADY_EXISTS: 409,
      REVIEW_NOT_ALLOWED: 400,
    };
    res.status(map[e.message] || 500).json({ message: reviewErrorMessage(e) });
  }
};

