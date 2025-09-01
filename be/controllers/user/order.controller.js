const db = require("../../models/db"); 
const Order = db.Order;
const OrderItem = db.OrderItem;

const createOrder = async (req, res) => {
  try {
    const { reservation_id, items } = req.body;
    if (!reservation_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });
    }

    // Tạo order mới
    const newOrder = await Order.create({
      reservation_id,
      status: "pre-ordered", // hoặc 'pending'
      created_at: new Date(),
    });

    // Thêm từng order_item
    for (const item of items) {
      await OrderItem.create({
        order_id: newOrder.order_id,
        item_id: item.item_id,
        quantity: item.quantity,
      });
    }

    res.json({ message: "Đặt món trước thành công!", order_id: newOrder.order_id });
  } catch (error) {
    console.error("❌ Lỗi khi đặt món trước:", error);
    res.status(500).json({ message: "Đặt món thất bại!" });
  }
};

module.exports = {
  createOrder,
};
