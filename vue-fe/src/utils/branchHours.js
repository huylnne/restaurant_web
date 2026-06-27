export const DEFAULT_OPEN_TIME = "08:00";
export const DEFAULT_CLOSE_TIME = "22:00";
/** Buffer giữ bàn khi đặt trước (UC05) */
export const RESERVATION_HOLD_MINUTES = 120;

export function parseHm(timeText) {
  if (timeText == null || timeText === "") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(timeText).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return { h, min };
}

export function resolveBranchHours(openTime, closeTime) {
  const open =
    openTime != null && String(openTime).trim() !== "" ? String(openTime).trim() : DEFAULT_OPEN_TIME;
  const close =
    closeTime != null && String(closeTime).trim() !== ""
      ? String(closeTime).trim()
      : DEFAULT_CLOSE_TIME;
  return { open, close };
}

/**
 * Kiểm tra giờ đặt bàn theo giờ mở cửa (local).
 * holdMinutes: buffer giữ bàn sau giờ đến.
 */
export function isWithinOpeningHours(date, openTime, closeTime, { holdMinutes = 0 } = {}) {
  return getOpeningHoursError(date, openTime, closeTime, { holdMinutes }) == null;
}

export function getOpeningHoursError(date, openTime, closeTime, { holdMinutes = 0 } = {}) {
  if (!date) return "Thời gian đặt bàn không hợp lệ.";
  const { open, close } = resolveBranchHours(openTime, closeTime);
  const openHm = parseHm(open);
  const closeHm = parseHm(close);
  if (!openHm || !closeHm) return "Giờ mở cửa chi nhánh chưa được cấu hình hợp lệ.";
  const resMin = date.getHours() * 60 + date.getMinutes();
  const openMin = openHm.h * 60 + openHm.min;
  const closeMin = closeHm.h * 60 + closeHm.min;
  if (resMin < openMin || resMin > closeMin) {
    return `Thời gian đặt bàn phải nằm trong giờ mở cửa (${open} – ${close}).`;
  }
  if (holdMinutes > 0 && resMin + holdMinutes > closeMin) {
    const holdHours = holdMinutes / 60;
    return `Giờ đặt quá gần giờ đóng cửa. Hệ thống giữ bàn ${holdHours} giờ sau giờ đến — vui lòng chọn sớm hơn.`;
  }
  return null;
}

/** Ghép ngày + giờ theo lịch local, tránh lệch khi date picker trả về UTC midnight. */
export function buildLocalReservationDate(datePart, timePart) {
  if (!datePart || !timePart) return null;
  const d = datePart instanceof Date ? datePart : new Date(datePart);
  const t = timePart instanceof Date ? timePart : new Date(timePart);
  if (Number.isNaN(d.getTime()) || Number.isNaN(t.getTime())) return null;
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    t.getHours(),
    t.getMinutes(),
    0,
    0
  );
}

export function formatBranchHoursLabel(openTime, closeTime) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  return `${open} – ${close}`;
}
