/**
 * UC10 – Trạng thái bàn (4 giá trị):
 * Trống | Đã đặt | Đang phục vụ | Chờ dọn
 */
const TABLE_STATUS = {
  AVAILABLE: "available",
  PRE_ORDERED: "pre-ordered",
  OCCUPIED: "occupied",
  CLEANING: "cleaning",
};

const TABLE_STATUS_VALUES = Object.values(TABLE_STATUS);

/** Alias cũ → chuẩn UC10 */
const STATUS_ALIASES = {
  reserved: TABLE_STATUS.PRE_ORDERED,
};

function normalizeTableStatus(status) {
  if (!status) return status;
  const s = String(status).trim().toLowerCase();
  return STATUS_ALIASES[s] || s;
}

function isValidTableStatus(status) {
  return TABLE_STATUS_VALUES.includes(normalizeTableStatus(status));
}

/** Bàn có thể đặt / walk-in */
function isBookableTableStatus(status) {
  return normalizeTableStatus(status) === TABLE_STATUS.AVAILABLE;
}

/** Bàn có thể tiếp nhận khách (trống hoặc đã gán đặt trước) → chuyển sang đang phục vụ */
function isCheckInableTableStatus(status) {
  const s = normalizeTableStatus(status);
  return s === TABLE_STATUS.AVAILABLE || s === TABLE_STATUS.PRE_ORDERED;
}

/** Kết thúc phiên (order) khi khách rời — trước khi trống hoặc khi chuyển chờ dọn */
function shouldEndTableSession(status) {
  const s = normalizeTableStatus(status);
  return s === TABLE_STATUS.AVAILABLE || s === TABLE_STATUS.CLEANING;
}

module.exports = {
  TABLE_STATUS,
  TABLE_STATUS_VALUES,
  normalizeTableStatus,
  isValidTableStatus,
  isBookableTableStatus,
  isCheckInableTableStatus,
  shouldEndTableSession,
};
