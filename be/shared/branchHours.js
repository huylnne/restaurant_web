/**
 * SHARED BRANCH HOURS — giờ mở/đóng cửa chi nhánh và validate thời gian đặt bàn.
 * Ctrl+F: branch hours, giờ mở cửa, RESERVATION_HOLD_MINUTES, getBranchHoursValidationMessage
 * Luồng demo: Phần 2 — đặt bàn phải nằm trong giờ mở cửa và còn đủ 2 giờ giữ bàn.
 */
const DEFAULT_OPEN_TIME = "08:00";
const DEFAULT_CLOSE_TIME = "22:00";
/** Buffer giữ bàn khi đặt trước (UC05) */
const RESERVATION_HOLD_MINUTES = 120;

/** [GIỜ MỞ CỬA] Parse chuỗi HH:mm hoặc HH:mm:ss từ DB chi nhánh. Ctrl+F: parseHm */
function parseHm(timeText) {
  if (timeText == null || timeText === "") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(timeText).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return { h, min };
}

/** [GIỜ MỞ CỬA] Nếu chi nhánh chưa cấu hình thì dùng mặc định 08:00–22:00. Ctrl+F: resolveBranchHours */
function resolveBranchHours(openTime, closeTime) {
  const open =
    openTime != null && String(openTime).trim() !== "" ? String(openTime).trim() : DEFAULT_OPEN_TIME;
  const close =
    closeTime != null && String(closeTime).trim() !== ""
      ? String(closeTime).trim()
      : DEFAULT_CLOSE_TIME;
  return { open, close };
}

/** [GIỜ MỞ CỬA] Đổi giờ/phút sang tổng phút để so sánh nhanh. Ctrl+F: hmToMinutes */
function hmToMinutes(hm) {
  if (!hm) return null;
  return hm.h * 60 + hm.min;
}

/**
 * [ĐẶT BÀN] Trả về thông báo lỗi nếu giờ đặt ngoài giờ mở cửa hoặc quá sát giờ đóng cửa.
 * Ctrl+F: getBranchHoursValidationMessage, giờ đặt quá gần giờ đóng cửa
 *
 * @param {Date} date
 * @param {string} openTime
 * @param {string} closeTime
 * @param {{ holdMinutes?: number, getMinutes?: (d: Date) => number|null }} options
 */
function getBranchHoursValidationMessage(date, openTime, closeTime, options = {}) {
  const { holdMinutes = 0, getMinutes } = options;
  if (!date) return "Thời gian đặt bàn không hợp lệ.";
  const { open, close } = resolveBranchHours(openTime, closeTime);
  const openHm = parseHm(open);
  const closeHm = parseHm(close);
  if (!openHm || !closeHm) return "Giờ mở cửa chi nhánh chưa được cấu hình hợp lệ.";

  const resMin =
    typeof getMinutes === "function"
      ? getMinutes(date)
      : date.getHours() * 60 + date.getMinutes();
  const openMin = hmToMinutes(openHm);
  const closeMin = hmToMinutes(closeHm);

  if (resMin == null || openMin == null || closeMin == null) {
    return "Thời gian đặt bàn không hợp lệ.";
  }
  if (resMin < openMin || resMin > closeMin) {
    return `Thời gian đặt bàn phải nằm trong giờ mở cửa (${open} – ${close}).`;
  }
  if (holdMinutes > 0 && resMin + holdMinutes > closeMin) {
    const holdHours = holdMinutes / 60;
    return `Giờ đặt quá gần giờ đóng cửa. Hệ thống giữ bàn ${holdHours} giờ sau giờ đến — vui lòng chọn sớm hơn.`;
  }
  return null;
}

/** [ĐẶT BÀN] Boolean wrapper cho validate giờ mở cửa. Ctrl+F: isWithinBranchHours */
function isWithinBranchHours(date, openTime, closeTime, options = {}) {
  return getBranchHoursValidationMessage(date, openTime, closeTime, options) == null;
}

/** [FE/BE DATE] Ghép ngày + giờ thành Date local để tránh lệch timezone khi chọn booking. Ctrl+F: buildLocalReservationDate */
function buildLocalReservationDate(datePart, timePart) {
  if (!datePart || !timePart) return null;
  const d = datePart instanceof Date ? datePart : new Date(datePart);
  const t = timePart instanceof Date ? timePart : new Date(timePart);
  if (Number.isNaN(d.getTime()) || Number.isNaN(t.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes(), 0, 0);
}

/** [HIỂN THỊ] Label giờ mở cửa cho UI chi nhánh. Ctrl+F: formatBranchHoursLabel */
function formatBranchHoursLabel(openTime, closeTime) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  return `${open} – ${close}`;
}

module.exports = {
  DEFAULT_OPEN_TIME,
  DEFAULT_CLOSE_TIME,
  RESERVATION_HOLD_MINUTES,
  parseHm,
  resolveBranchHours,
  hmToMinutes,
  getBranchHoursValidationMessage,
  isWithinBranchHours,
  buildLocalReservationDate,
  formatBranchHoursLabel,
};
