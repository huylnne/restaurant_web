import { Op } from "sequelize";
import { Payment, Order, User, OrderItem } from "../models/index.js";

export const dashboardService = {
  async getOverview() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // 1. Doanh thu hôm nay
    const todayRevenue = await Payment.sum("amount", {
      where: { created_at: { [Op.between]: [startOfDay, endOfDay] } },
    });

    // 2. Số đơn hàng hôm nay
    const orderCount = await Order.count({
      where: { created_at: { [Op.between]: [startOfDay, endOfDay] } },
    });

    // 3. Số khách hàng (role = CUSTOMER)
    const customerCount = await User.count({
      where: { role: "CUSTOMER" },
    });

    // 4. Món ăn bán ra hôm nay
    const dishesSold = await OrderItem.sum("quantity", {
      include: [
        {
          model: Order,
          as: "order",
          where: { created_at: { [Op.between]: [startOfDay, endOfDay] } },
        },
      ],
    });

    // Trả về data
    return {
      "revenue.today": todayRevenue || 0,
      "orders.count": orderCount || 0,
      "users.total": customerCount || 0,
      "dishes.sold": dishesSold || 0,
    };
  },
};
