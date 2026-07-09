const DEFAULT_OPEN_TIME = "08:00";
const DEFAULT_CLOSE_TIME = "24:00";
/** Buffer giữ bàn khi đặt trước (UC05) */
const RESERVATION_HOLD_MINUTES = 120;

function parseHm(timeText) {
  if (timeText == null || timeText === "") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(timeText).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || min > 59) return null;
  if (h > 24) return null;
  if (h === 24 && min !== 0) return null;
  return { h, min };
}

function resolveBranchHours(openTime, closeTime) {
  const open =
    openTime != null && String(openTime).trim() !== "" ? String(openTime).trim() : DEFAULT_OPEN_TIME;
  const close =
    closeTime != null && String(closeTime).trim() !== ""
      ? String(closeTime).trim()
      : DEFAULT_CLOSE_TIME;
  return { open, close };
}

function hmToMinutes(hm) {
  if (!hm) return null;
  return hm.h * 60 + hm.min;
}

/**
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
    return `Thời gian đặt bàn phải nằm trong giờ mở cửa (${formatBranchHoursDisplayVi(open, close)}).`;
  }
  if (holdMinutes > 0 && resMin + holdMinutes > closeMin) {
    const holdHours = holdMinutes / 60;
    return `Giờ đặt quá gần giờ đóng cửa. Hệ thống giữ bàn ${holdHours} giờ sau giờ đến — vui lòng chọn sớm hơn.`;
  }
  return null;
}

function isWithinBranchHours(date, openTime, closeTime, options = {}) {
  return getBranchHoursValidationMessage(date, openTime, closeTime, options) == null;
}

function buildLocalReservationDate(datePart, timePart) {
  if (!datePart || !timePart) return null;
  const d = datePart instanceof Date ? datePart : new Date(datePart);
  const t = timePart instanceof Date ? timePart : new Date(timePart);
  if (Number.isNaN(d.getTime()) || Number.isNaN(t.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes(), 0, 0);
}

function formatBranchHoursLabel(openTime, closeTime) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  return `${open} – ${close}`;
}

/** Đổi HH:mm sang dạng đọc tiếng Việt (vd. 08:00 → 8h sáng, 24:00 → 12h đêm). */
function formatHmDisplayVi(timeText) {
  const hm = parseHm(timeText);
  if (!hm) return String(timeText || "").trim();
  const { h, min } = hm;
  const minSuffix = min === 0 ? "" : String(min).padStart(2, "0");

  if (h === 24 || h === 0) {
    return min === 0 ? "12h đêm" : `12h${minSuffix} đêm`;
  }
  if (h === 12) {
    return min === 0 ? "12h trưa" : `12h${minSuffix} trưa`;
  }
  if (h < 12) {
    return min === 0 ? `${h}h sáng` : `${h}h${minSuffix} sáng`;
  }
  const pmHour = h - 12;
  const period = h < 18 ? "chiều" : "tối";
  return min === 0 ? `${pmHour}h ${period}` : `${pmHour}h${minSuffix} ${period}`;
}

/** Label giờ mở cửa tiếng Việt cho UI khách hàng. */
function formatBranchHoursDisplayVi(openTime, closeTime) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  return `${formatHmDisplayVi(open)} – ${formatHmDisplayVi(close)}`;
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
  formatHmDisplayVi,
  formatBranchHoursDisplayVi,
};
