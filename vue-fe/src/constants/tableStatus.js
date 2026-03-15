/**
 * Trạng thái bàn – dùng chung cho admin (Quản lý bàn) và user (Lịch sử dùng bữa).
 * Backend chỉ dùng 3 giá trị: available | occupied | pre-ordered
 */

export const TABLE_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  PRE_ORDERED: "pre-ordered",
};

/** Nhãn tiếng Việt */
export const TABLE_STATUS_LABELS = {
  [TABLE_STATUS.AVAILABLE]: "Trống",
  [TABLE_STATUS.OCCUPIED]: "Đang phục vụ",
  [TABLE_STATUS.PRE_ORDERED]: "Đã đặt trước",
  // Alias: API cũ có thể trả "reserved" -> coi như pre-ordered
  reserved: "Đã đặt trước",
};

/** Chuẩn hóa giá trị từ API (reserved -> pre-ordered) */
export function normalizeTableStatus(status) {
  if (!status) return status;
  const s = String(status).trim().toLowerCase();
  if (s === "reserved") return TABLE_STATUS.PRE_ORDERED;
  return s;
}

export function getTableStatusLabel(status) {
  const normalized = normalizeTableStatus(status);
  return TABLE_STATUS_LABELS[normalized] ?? status ?? "-";
}

/** CSS class cho thẻ trạng thái (admin) */
export function getTableStatusClass(status) {
  const normalized = normalizeTableStatus(status);
  const map = {
    [TABLE_STATUS.AVAILABLE]: "status-available",
    [TABLE_STATUS.OCCUPIED]: "status-occupied",
    [TABLE_STATUS.PRE_ORDERED]: "status-reserved",
  };
  return map[normalized] ?? "";
}

/** Element Plus tag type (admin) */
export function getTableTagType(status) {
  const normalized = normalizeTableStatus(status);
  const map = {
    [TABLE_STATUS.AVAILABLE]: "success",
    [TABLE_STATUS.OCCUPIED]: "warning",
    [TABLE_STATUS.PRE_ORDERED]: "info",
  };
  return map[normalized] ?? "";
}
