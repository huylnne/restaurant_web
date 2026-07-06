/**
 * SHARED TABLE STATUS — trạng thái bàn dùng chung FE/BE.
 * UC10: available | pre-ordered | occupied | cleaning
 * Ctrl+F: table status, available, occupied, cleaning, trạng thái bàn
 * Luồng demo: trống → đã đặt trước/check-in → đang phục vụ → chờ dọn → trống.
 */

const TABLE_STATUS = {
  AVAILABLE: "available",
  PRE_ORDERED: "pre-ordered",
  OCCUPIED: "occupied",
  CLEANING: "cleaning",
};

/** [TABLE STATUS] Danh sách trạng thái chuẩn để validate request đổi trạng thái bàn. Ctrl+F: TABLE_STATUS_VALUES */
const TABLE_STATUS_VALUES = Object.values(TABLE_STATUS);

/** [TƯƠNG THÍCH DB] Alias trạng thái cũ reserved → pre-ordered. Ctrl+F: STATUS_ALIASES */
const STATUS_ALIASES = {
  reserved: TABLE_STATUS.PRE_ORDERED,
};

/** [TABLE STATUS] Chuẩn hóa trạng thái bàn trước khi so sánh. Ctrl+F: normalizeTableStatus */
function normalizeTableStatus(status) {
  if (!status) return status;
  const s = String(status).trim().toLowerCase();
  return STATUS_ALIASES[s] || s;
}

/** [TABLE STATUS] Validate status gửi từ Admin/phục vụ. Ctrl+F: isValidTableStatus */
function isValidTableStatus(status) {
  return TABLE_STATUS_VALUES.includes(normalizeTableStatus(status));
}

/** [ĐẶT BÀN] Chỉ bàn available mới được chọn cho đặt bàn/walk-in. Ctrl+F: isBookableTableStatus */
function isBookableTableStatus(status) {
  return normalizeTableStatus(status) === TABLE_STATUS.AVAILABLE;
}

/** [CHECK-IN] Bàn available/pre-ordered có thể chuyển sang occupied khi khách tới. Ctrl+F: isCheckInableTableStatus */
function isCheckInableTableStatus(status) {
  const s = normalizeTableStatus(status);
  return s === TABLE_STATUS.AVAILABLE || s === TABLE_STATUS.PRE_ORDERED;
}

/** [KẾT THÚC PHIÊN] Chuyển bàn về cleaning/available thì order được complete. Ctrl+F: shouldEndTableSession */
function shouldEndTableSession(status) {
  const s = normalizeTableStatus(status);
  return s === TABLE_STATUS.AVAILABLE || s === TABLE_STATUS.CLEANING;
}

/** [QR GỌI MÓN] Chỉ bàn đang phục vụ/pre-ordered mới cho khách gọi món qua QR. Ctrl+F: isTableOrderableViaQr */
function isTableOrderableViaQr(status) {
  const s = normalizeTableStatus(status);
  return s === TABLE_STATUS.OCCUPIED || s === TABLE_STATUS.PRE_ORDERED;
}

module.exports = {
  TABLE_STATUS,
  TABLE_STATUS_VALUES,
  normalizeTableStatus,
  isValidTableStatus,
  isBookableTableStatus,
  isCheckInableTableStatus,
  shouldEndTableSession,
  isTableOrderableViaQr,
};
