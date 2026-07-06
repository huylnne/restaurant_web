/**
 * UTIL ORDER ITEM FACTORY — dựng payload OrderItem từ item_id/quantity/note khi khách/phục vụ gọi món.
 * Ctrl+F: order item factory, buildOrderItemPayloads, loadMenuItemsByIds, giá món
 * Dùng bởi: đặt món trước, gọi món phục vụ, gọi món QR.
 */
const { MenuItem } = require('../models');
const { resolveMenuItemUnitPrice } = require('./menuItemPrice');
const { ORDER_ITEM_STATUS } = require('./orderItemStatus');

/** [GỌI MÓN] Load menu_items theo danh sách item_id, chống N+1 query khi tạo nhiều món. Ctrl+F: loadMenuItemsByIds */
async function loadMenuItemsByIds(itemIds, transaction) {
  const ids = [...new Set(itemIds.map((id) => Number(id)).filter(Number.isFinite))];
  if (!ids.length) return new Map();

  const rows = await MenuItem.findAll({
    where: { item_id: ids },
    transaction,
  });
  return new Map(rows.map((row) => [row.item_id, row]));
}

/**
 * [GỌI MÓN] Dựng payload OrderItem: lấy giá hiện tại/sale_price, quantity, note, status=pending cho bếp.
 * Ctrl+F: buildOrderItemPayloads, tạo OrderItem
 *
 * @param {{ item_id: number, quantity?: number, note?: string }[]} items
 */
async function buildOrderItemPayloads(items, transaction) {
  const menuById = await loadMenuItemsByIds(
    items.map((it) => it.item_id),
    transaction
  );

  return items.map((it) => {
    const menuItem = menuById.get(Number(it.item_id));
    if (!menuItem) {
      throw new Error(`Menu item ${it.item_id} not found`);
    }
    return {
      item_id: menuItem.item_id,
      quantity: it.quantity || 1,
      price: resolveMenuItemUnitPrice(menuItem),
      note: it.note || null,
      status: ORDER_ITEM_STATUS.PENDING,
      ordered_at: new Date(),
    };
  });
}

module.exports = {
  loadMenuItemsByIds,
  buildOrderItemPayloads,
};
