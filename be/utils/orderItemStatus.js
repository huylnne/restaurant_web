/**
 * Pipeline bếp / phục vụ (order_items.status)
 */

const ORDER_ITEM_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  SERVED: "served",
};

const ORDER_ITEM_STATUS_VALUES = Object.values(ORDER_ITEM_STATUS);

/** Món hiển thị trên màn bếp */
const KITCHEN_QUEUE_STATUSES = [ORDER_ITEM_STATUS.PENDING, ORDER_ITEM_STATUS.PROCESSING];

function normalizeOrderItemStatus(status) {
  if (status == null || status === "") return status;
  return String(status).trim().toLowerCase();
}

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
