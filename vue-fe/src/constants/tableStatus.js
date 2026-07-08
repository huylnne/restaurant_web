/**
 * TABLE STATUS (FE) — tái xuất trạng thái bàn từ shared + các hàm map sang nhãn/CSS class/tag type
 * để hiển thị đồng nhất trên sơ đồ bàn.
 */
import shared from "@shared/tableStatus.js";

export const TABLE_STATUS = shared.TABLE_STATUS;
export const normalizeTableStatus = shared.normalizeTableStatus;

export const TABLE_STATUS_LABELS = {
  [TABLE_STATUS.AVAILABLE]: "Trống",
  [TABLE_STATUS.PRE_ORDERED]: "Đã đặt",
  [TABLE_STATUS.OCCUPIED]: "Đang phục vụ",
  [TABLE_STATUS.CLEANING]: "Chờ dọn",
  reserved: "Đã đặt",
};

export function getTableStatusLabel(status) {
  const normalized = normalizeTableStatus(status);
  return TABLE_STATUS_LABELS[normalized] ?? status ?? "-";
}

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
