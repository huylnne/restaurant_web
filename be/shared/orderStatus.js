/**
 * SHARED ORDER STATUS — trạng thái vòng đời đặt bàn/phiên phục vụ trong orders.status.
 * pending | confirmed | pre-ordered | in_progress | waiting_payment | completed | cancelled | no_show
 * Ctrl+F: order status, pending, pre-ordered, waiting_payment, completed
 * Luồng demo: đặt bàn → check-in → gọi món → yêu cầu thanh toán → hoàn tất.
 */

const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PRE_ORDERED: "pre-ordered",
  IN_PROGRESS: "in_progress",
  WAITING_PAYMENT: "waiting_payment",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
};

/** [ORDER STATUS] Danh sách status chuẩn hiện tại để validate/normalize. Ctrl+F: ORDER_STATUS_VALUES */
const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

/**
 * [ORDER ACTIVE] Các giá trị được coi là phiên còn sống, gồm cả legacy viết hoa/cũ trong DB.
 * Ctrl+F: ACTIVE_ORDER_STATUS_DB_VALUES, active session
 */
const ACTIVE_ORDER_STATUS_DB_VALUES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PRE_ORDERED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.WAITING_PAYMENT,
  "open",
  "PENDING",
  "pending",
  "pre-ordered",
  "preorder",
  "IN_PROGRESS",
];

/** [ORDER TERMINAL] Order đã kết thúc, không còn hiển thị như phiên đang phục vụ. Ctrl+F: TERMINAL_ORDER_STATUS_DB_VALUES */
const TERMINAL_ORDER_STATUS_DB_VALUES = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.NO_SHOW,
  "COMPLETED",
  "CANCELLED",
];

/** [BÁO CÁO] Status được tính là đã hoàn tất để cộng doanh thu. Ctrl+F: COMPLETED_ORDER_STATUS_DB_VALUES */
const COMPLETED_ORDER_STATUS_DB_VALUES = [ORDER_STATUS.COMPLETED, "COMPLETED"];

/** [BẾP/PHỤC VỤ] Status order đang xử lý món. Ctrl+F: IN_PROGRESS_ORDER_STATUS_DB_VALUES */
const IN_PROGRESS_ORDER_STATUS_DB_VALUES = [ORDER_STATUS.IN_PROGRESS, "IN_PROGRESS"];

/** [ORDER STATUS] Chuẩn hóa status legacy/viết hoa về format mới. Ctrl+F: normalizeOrderStatus */
function normalizeOrderStatus(status) {
  if (status == null || status === "") return status;
  const s = String(status).trim();
  const lower = s.toLowerCase();
  if (ORDER_STATUS_VALUES.includes(lower)) return lower;
  if (s === "PENDING") return ORDER_STATUS.PENDING;
  if (s === "IN_PROGRESS") return ORDER_STATUS.IN_PROGRESS;
  if (s === "COMPLETED") return ORDER_STATUS.COMPLETED;
  if (s === "CANCELLED") return ORDER_STATUS.CANCELLED;
  if (s === "NO_SHOW") return ORDER_STATUS.NO_SHOW;
  if (lower === "open" || lower === "preorder") return ORDER_STATUS.PRE_ORDERED;
  return lower;
}

/** [ORDER ACTIVE] Kiểm tra order còn trong luồng phục vụ chưa kết thúc. Ctrl+F: isActiveOrderStatus */
function isActiveOrderStatus(status) {
  const n = normalizeOrderStatus(status);
  return [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PRE_ORDERED,
    ORDER_STATUS.IN_PROGRESS,
    ORDER_STATUS.WAITING_PAYMENT,
  ].includes(n);
}

/** [TƯƠNG THÍCH DB] Nhận diện status pre-order cũ còn sót trong seed/migration. Ctrl+F: isLegacyPreorderOrderStatus */
function isLegacyPreorderOrderStatus(status) {
  const raw = String(status ?? "").trim();
  return raw === "pre-ordered" || raw === "preorder";
}

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
  ACTIVE_ORDER_STATUS_DB_VALUES,
  TERMINAL_ORDER_STATUS_DB_VALUES,
  COMPLETED_ORDER_STATUS_DB_VALUES,
  IN_PROGRESS_ORDER_STATUS_DB_VALUES,
  normalizeOrderStatus,
  isActiveOrderStatus,
  isLegacyPreorderOrderStatus,
};
