const APP_TZ = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";
const DEFAULT_OPEN_TIME = "08:00";
const DEFAULT_CLOSE_TIME = "22:00";
/** Buffer giữ bàn khi đặt trước (UC05) */
const RESERVATION_HOLD_MINUTES = 120;

function parseHm(timeText) {
  if (timeText == null || timeText === "") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(timeText).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function resolveBranchHours(openTime, closeTime) {
  const open = openTime != null && String(openTime).trim() !== "" ? String(openTime).trim() : DEFAULT_OPEN_TIME;
  const close =
    closeTime != null && String(closeTime).trim() !== "" ? String(closeTime).trim() : DEFAULT_CLOSE_TIME;
  return { open, close };
}

function getMinutesInAppTz(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

/**
 * Kiểm tra giờ đặt bàn hợp lệ theo giờ mở cửa chi nhánh.
 * holdMinutes: thời gian giữ bàn sau giờ đến (đặt bàn = 120 phút).
 */
function isWithinBranchHours(reservationDate, openTime, closeTime, { holdMinutes = 0 } = {}) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  const resMin = getMinutesInAppTz(reservationDate);
  const openMin = parseHm(open);
  const closeMin = parseHm(close);
  if (resMin == null || openMin == null || closeMin == null) return false;
  if (resMin < openMin || resMin > closeMin) return false;
  if (holdMinutes > 0 && resMin + holdMinutes > closeMin) return false;
  return true;
}

function getBranchHoursValidationMessage(reservationDate, openTime, closeTime, { holdMinutes = 0 } = {}) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  const resMin = getMinutesInAppTz(reservationDate);
  const openMin = parseHm(open);
  const closeMin = parseHm(close);
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

module.exports = {
  APP_TZ,
  DEFAULT_OPEN_TIME,
  DEFAULT_CLOSE_TIME,
  RESERVATION_HOLD_MINUTES,
  parseHm,
  resolveBranchHours,
  getMinutesInAppTz,
  isWithinBranchHours,
  getBranchHoursValidationMessage,
};
