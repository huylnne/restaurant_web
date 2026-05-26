const { OrderItem, MenuItem } = require('../../models');
const {
  findKitchenOrderItems,
  syncOrderStatusFromItems,
  orderTableInclude,
} = require('../../utils/orderQueries');
const { normalizeOrderItemStatus, ORDER_ITEM_STATUS } = require('../../utils/orderItemStatus');

const kitchenService = {
  async getOrderItemsByStatus(status = ORDER_ITEM_STATUS.PENDING, branchId = 1) {
    return findKitchenOrderItems({ itemStatus: status, branchId });
  },

  async updateOrderItemStatus(orderItemId, newStatus, branchId = 1) {
    const item = await OrderItem.findOne({
      where: { order_item_id: orderItemId },
      include: [{ model: MenuItem, attributes: ['branch_id'] }],
    });
    if (!item) throw new Error('OrderItem not found');
    if (item.MenuItem?.branch_id !== Number(branchId)) {
      throw new Error('Không có quyền cập nhật món của chi nhánh khác');
    }

    const normalized = normalizeOrderItemStatus(newStatus);
    item.status = normalized;
    await item.save();
    await syncOrderStatusFromItems(item.order_id);

    await item.reload({
      include: [
        { model: MenuItem, attributes: ['name', 'branch_id', 'item_id'] },
        ...orderTableInclude(),
      ],
    });
    return item;
  },

  async getNewItems(limit = 100) {
    const res = await this.getOrderItemsByStatus(ORDER_ITEM_STATUS.PENDING);
    return res.slice(0, limit);
  },
};

module.exports = kitchenService;
