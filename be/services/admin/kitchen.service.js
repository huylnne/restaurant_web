/**
 * SERVICE BẾP (KITCHEN) — hàng đợi món, cập nhật trạng thái chế biến realtime.
 * Ctrl+F: bếp, kitchen, chờ chế biến, đang chế biến, hoàn thành
 * Luồng demo: Phần 3 — Bước 3.4 (/admin/kitchen, WebSocket)
 * API: GET /api/admin/kitchen/items, PATCH /api/admin/kitchen/items/:id
 */
const { OrderItem, MenuItem } = require('../../models');
const {
  findKitchenOrderItems,
  syncOrderStatusFromItems,
  orderTableInclude,
  resolveOrderBranchId,
} = require('../../utils/orderQueries');
const { groupKitchenItemsByTable } = require('../../utils/kitchenQueue');
const { normalizeOrderItemStatus, ORDER_ITEM_STATUS } = require('../../utils/orderItemStatus');

const kitchenService = {
  /**
   * [BẾP] Lấy món theo trạng thái (pending/cooking/done), nhóm theo bàn — màn /admin/kitchen.
   * Ctrl+F: getOrderItemsByStatus, hàng đợi bếp
   */
  async getOrderItemsByStatus(status = ORDER_ITEM_STATUS.PENDING, branchId = 1) {
    const items = await findKitchenOrderItems({ itemStatus: status, branchId });
    const tables = groupKitchenItemsByTable(items);
    return { tables, items, total_items: items.length, total_tables: tables.length };
  },

  /**
   * [BẾP] Cập nhật trạng thái 1 món (pending→cooking→done), sync order + notify WebSocket.
   * Luồng demo: Phần 3 — Bước 3.4. Ctrl+F: updateOrderItemStatus, chế biến
   */
  async updateOrderItemStatus(orderItemId, newStatus, branchId = 1) {
    const item = await OrderItem.findOne({
      where: { order_item_id: orderItemId },
      include: [
        { model: MenuItem, attributes: ['branch_id', 'name', 'item_id'] },
        ...orderTableInclude(),
      ],
    });
    if (!item) throw new Error('OrderItem not found');
    const itemBranchId = resolveOrderBranchId(item.toJSON());
    if (itemBranchId == null || Number(itemBranchId) !== Number(branchId)) {
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

  /** [BẾP] Món mới vừa vào hàng đợi (alias pending). Ctrl+F: getNewItems */
  async getNewItems(limit = 100) {
    const res = await this.getOrderItemsByStatus(ORDER_ITEM_STATUS.PENDING);
    return res.items.slice(0, limit);
  },
};

module.exports = kitchenService;
