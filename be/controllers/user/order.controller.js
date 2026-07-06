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
    const orderId = req.body.order_id || req.body.reservation_id;
    const { items, note } = req.body;
    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });
    }

    const orderNote =
      note != null && String(note).trim() ? String(note).trim().slice(0, 200) : null;

    const sessionOrder = await Order.findByPk(orderId, {
      attributes: ["order_id", "branch_id", "table_id", "user_id", "status"],
    });
    if (!sessionOrder) {
      return res.status(404).json({ message: "Không tìm thấy phiên đặt bàn!" });
    }

    const orderItemsPayload = await buildOrderItemPayloads(items);

    for (const payload of orderItemsPayload) {
      await OrderItem.create({
        order_id: sessionOrder.order_id,
        ...payload,
      });
    }

    if (orderNote && !sessionOrder.note) {
      await sessionOrder.update({ note: orderNote });
    }

    // Giữ status confirmed/pending — tiếp nhận khách do nhân viên xác nhận (checked_in_at).

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
