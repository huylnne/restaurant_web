/**
 * UTIL ORDER ITEM STATUS — pipeline món ăn trong bếp/phục vụ (order_items.status).
 * Ctrl+F: order item status, pending, processing, done, served, trạng thái món
 * Luồng demo: Phần 3 — bếp chuyển pending → processing → done, phục vụ chuyển served.
 */

const ORDER_ITEM_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  SERVED: "served",
};

/** [MÓN ĂN] Danh sách status chuẩn để validate khi bếp cập nhật. Ctrl+F: ORDER_ITEM_STATUS_VALUES */
const ORDER_ITEM_STATUS_VALUES = Object.values(ORDER_ITEM_STATUS);

/** [BẾP] Món hiển thị trên màn bếp: chờ chế biến hoặc đang chế biến. Ctrl+F: KITCHEN_QUEUE_STATUSES */
const KITCHEN_QUEUE_STATUSES = [ORDER_ITEM_STATUS.PENDING, ORDER_ITEM_STATUS.PROCESSING];

/** [MÓN ĂN] Chuẩn hóa status món trước khi so sánh/lưu. Ctrl+F: normalizeOrderItemStatus */
function normalizeOrderItemStatus(status) {
  if (status == null || status === "") return status;
  return String(status).trim().toLowerCase();
}

/** [BẾP] Kiểm tra món còn nằm trong hàng đợi bếp hay đã done/served. Ctrl+F: isKitchenQueueStatus */
function isKitchenQueueStatus(status) {
  return KITCHEN_QUEUE_STATUSES.includes(normalizeOrderItemStatus(status));
}

module.exports = {
  ORDER_ITEM_STATUS,
  ORDER_ITEM_STATUS_VALUES,
  KITCHEN_QUEUE_STATUSES,
  normalizeOrderItemStatus,
  isKitchenQueueStatus,
};
