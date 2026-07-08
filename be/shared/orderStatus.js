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
  // B1: giá trị rỗng/null thì trả về nguyên trạng, không cố ép kiểu (tránh biến null thành "null").
  if (status == null || status === "") return status;
  // B2: ép về chuỗi và bỏ khoảng trắng thừa hai đầu (dữ liệu DB có thể dính space).
  const s = String(status).trim();
  // B3: tạo bản viết thường để so khớp không phân biệt hoa/thường.
  const lower = s.toLowerCase();
  // B4: nếu đã là 1 trong các status chuẩn (viết thường) thì dùng luôn.
  if (ORDER_STATUS_VALUES.includes(lower)) return lower;
  // B5: các status legacy viết HOA trong DB cũ → ánh xạ sang hằng chuẩn.
  if (s === "PENDING") return ORDER_STATUS.PENDING;
  if (s === "IN_PROGRESS") return ORDER_STATUS.IN_PROGRESS;
  if (s === "COMPLETED") return ORDER_STATUS.COMPLETED;
  if (s === "CANCELLED") return ORDER_STATUS.CANCELLED;
  if (s === "NO_SHOW") return ORDER_STATUS.NO_SHOW;
  // B6: các tên cũ "open"/"preorder" đều được coi là đã đặt trước (pre-ordered).
  if (lower === "open" || lower === "preorder") return ORDER_STATUS.PRE_ORDERED;
  // B7: không khớp gì thì trả bản viết thường để phía gọi tự xử lý.
  return lower;
}

/** [ORDER ACTIVE] Kiểm tra order còn trong luồng phục vụ chưa kết thúc. Ctrl+F: isActiveOrderStatus */
function isActiveOrderStatus(status) {
  // Chuẩn hóa trước để so khớp thống nhất (không lo hoa/thường/legacy).
  const n = normalizeOrderStatus(status);
  // "Còn sống" = đang ở một trong các bước từ lúc đặt tới lúc chờ thanh toán.
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
  // Ép chuỗi an toàn (kể cả null/undefined) rồi bỏ space thừa.
  const raw = String(status ?? "").trim();
  // Chấp nhận cả 2 cách viết cũ để không bỏ sót dữ liệu seed đời đầu.
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
