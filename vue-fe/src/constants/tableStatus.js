/**
 * UC10 – Trạng thái bàn (4 giá trị, đồng bộ backend):
 * available | pre-ordered | occupied | cleaning
 */

export const TABLE_STATUS = {
  AVAILABLE: "available",
  PRE_ORDERED: "pre-ordered",
  OCCUPIED: "occupied",
  CLEANING: "cleaning",
};

/** Nhãn tiếng Việt theo đồ án UC10 */
export const TABLE_STATUS_LABELS = {
  [TABLE_STATUS.AVAILABLE]: "Trống",
  [TABLE_STATUS.PRE_ORDERED]: "Đã đặt",
  [TABLE_STATUS.OCCUPIED]: "Đang phục vụ",
  [TABLE_STATUS.CLEANING]: "Chờ dọn",
  reserved: "Đã đặt",
};

/** Chuẩn hóa giá trị từ API (reserved → pre-ordered) */
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
    [TABLE_STATUS.CLEANING]: "status-cleaning",
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
    [TABLE_STATUS.CLEANING]: "",
  };
  return map[normalized] ?? "";
}
