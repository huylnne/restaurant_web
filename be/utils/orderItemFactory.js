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
  // Ép về số, bỏ giá trị không hợp lệ, khử trùng bằng Set → danh sách id sạch.
  const ids = [...new Set(itemIds.map((id) => Number(id)).filter(Number.isFinite))];
  // Không có id nào thì trả Map rỗng luôn (khỏi query DB thừa).
  if (!ids.length) return new Map();

  // Một truy vấn duy nhất lấy tất cả món (tránh N+1 — không query từng món trong vòng lặp).
  const rows = await MenuItem.findAll({
    where: { item_id: ids },
    transaction,
  });
  // Trả về Map item_id → MenuItem để tra cứu O(1) khi dựng payload.
  return new Map(rows.map((row) => [row.item_id, row]));
}

/**
 * [GỌI MÓN] Dựng payload OrderItem: lấy giá hiện tại/sale_price, quantity, note, status=pending cho bếp.
 * Ctrl+F: buildOrderItemPayloads, tạo OrderItem
 *
 * @param {{ item_id: number, quantity?: number, note?: string }[]} items
 */
async function buildOrderItemPayloads(items, transaction) {
  // Nạp trước tất cả MenuItem cần dùng (1 query) để map giá/tên nhanh.
  const menuById = await loadMenuItemsByIds(
    items.map((it) => it.item_id),
    transaction
  );

  return items.map((it) => {
    // Tra món theo id; không tìm thấy → ném lỗi (id sai / món đã xóa).
    const menuItem = menuById.get(Number(it.item_id));
    if (!menuItem) {
      throw new Error(`Menu item ${it.item_id} not found`);
    }
    return {
      item_id: menuItem.item_id,
      quantity: it.quantity || 1, // thiếu số lượng → mặc định 1
      // "Chốt giá" tại thời điểm gọi món (kể cả sale) để bill không đổi khi menu chỉnh giá sau này.
      price: resolveMenuItemUnitPrice(menuItem),
      note: it.note || null, // ghi chú tùy chọn (vd "ít cay")
      status: ORDER_ITEM_STATUS.PENDING, // món mới luôn vào bếp ở trạng thái chờ
      ordered_at: new Date(), // mốc thời gian gọi món để bếp sắp thứ tự
    };
  });
}

module.exports = {
  loadMenuItemsByIds,
  buildOrderItemPayloads,
};
