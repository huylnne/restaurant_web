/**
 * CONTROLLER ĐẶT MÓN TRƯỚC — gắn món vào order đặt bàn ngay khi booking (pre-order).
 * Ctrl+F: đặt món trước, pre-order, pre_ordered
 * Luồng demo: Phần 2 — Bước 2.3 (bật Đặt món trước)
 */
const db = require("../../models/db");
const Order = db.Order;
const OrderItem = db.OrderItem;
const realtimeHub = require("../../realtimeHub");
const { buildOrderItemPayloads } = require("../../utils/orderItemFactory");

/**
 * [ĐẶT MÓN TRƯỚC] POST — thêm OrderItem vào reservation, notify bếp (chưa check-in).
 * Ctrl+F: createOrder pre-order
 */
const createOrder = async (req, res) => {
  try {
    // Chấp nhận cả order_id lẫn reservation_id (FE cũ dùng tên khác nhau cho cùng 1 id).
    const orderId = req.body.order_id || req.body.reservation_id;
    const { items, note } = req.body;
    // Bắt buộc có id đơn và danh sách món không rỗng.
    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });
    }

    // Chuẩn hóa ghi chú: cắt tối đa 200 ký tự, rỗng → null.
    const orderNote =
      note != null && String(note).trim() ? String(note).trim().slice(0, 200) : null;

    // Đơn đặt bàn phải tồn tại mới cho gắn món trước.
    const sessionOrder = await Order.findByPk(orderId, {
      attributes: ["order_id", "branch_id", "table_id", "user_id", "status"],
    });
    if (!sessionOrder) {
      return res.status(404).json({ message: "Không tìm thấy phiên đặt bàn!" });
    }

    // Dựng payload chuẩn (chốt giá, trạng thái ban đầu) từ danh sách item client gửi.
    const orderItemsPayload = await buildOrderItemPayloads(items);

    // Ghi từng món vào order hiện tại.
    for (const payload of orderItemsPayload) {
      await OrderItem.create({
        order_id: sessionOrder.order_id,
        ...payload,
      });
    }

    // Chỉ gán note nếu đơn chưa có note trước đó (không ghi đè ghi chú cũ).
    if (orderNote && !sessionOrder.note) {
      await sessionOrder.update({ note: orderNote });
    }

    // Giữ status confirmed/pending — tiếp nhận khách do nhân viên xác nhận (checked_in_at).

    // Bắn realtime tới màn hình chi nhánh (bếp/phục vụ) để cập nhật ngay.
    // Bọc try/catch riêng: lỗi realtime KHÔNG được làm hỏng việc đặt món đã lưu thành công.
    try {
      if (sessionOrder.branch_id) {
        realtimeHub.notifyBranch(sessionOrder.branch_id, {
          type: "order_flow",
          reason: "user_preorder",
          order_id: Number(sessionOrder.order_id),
        });
      }
    } catch (_) {}

    req.audit = { entityId: sessionOrder.order_id, metadata: { order_id: sessionOrder.order_id } };
    res.json({
      message: "Đặt món trước thành công!",
      order_id: sessionOrder.order_id,
    });
  } catch (error) {
    console.error("❌ Lỗi khi đặt món trước:", error);
    res.status(500).json({ message: "Đặt món thất bại!" });
  }
};

module.exports = {
  createOrder,
};
