/**
 * SHARED BRANCH HOURS — giờ mở/đóng cửa chi nhánh và validate thời gian đặt bàn.
 * Ctrl+F: branch hours, giờ mở cửa, RESERVATION_HOLD_MINUTES, getBranchHoursValidationMessage
 * Luồng demo: Phần 2 — đặt bàn phải nằm trong giờ mở cửa và còn đủ 2 giờ giữ bàn.
 */
const DEFAULT_OPEN_TIME = "08:00";
const DEFAULT_CLOSE_TIME = "24:00";
/** Buffer giữ bàn khi đặt trước (UC05) */
const RESERVATION_HOLD_MINUTES = 120;

/** [GIỜ MỞ CỬA] Parse chuỗi HH:mm hoặc HH:mm:ss từ DB chi nhánh. Ctrl+F: parseHm */
function parseHm(timeText) {
  // Không có dữ liệu giờ thì trả null để phía gọi biết mà dùng mặc định.
  if (timeText == null || timeText === "") return null;
  // Regex: 1-2 chữ số giờ, ":", đúng 2 chữ số phút, phần ":ss" (giây) là tùy chọn.
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(timeText).trim());
  // Không đúng định dạng HH:mm(:ss) → null.
  if (!m) return null;
  // m[1] = giờ, m[2] = phút (đã tách bởi nhóm bắt trong regex).
  const h = Number(m[1]);
  const min = Number(m[2]);
  // Cho phép 24:00 như mốc "kết thúc ngày"; các giá trị khác >23 vẫn không hợp lệ.
  if (!Number.isFinite(h) || !Number.isFinite(min) || min > 59) return null;
  if (h > 24) return null;
  if (h === 24 && min !== 0) return null;
  return { h, min };
}

/** [GIỜ MỞ CỬA] Nếu chi nhánh chưa cấu hình thì dùng mặc định 08:00–24:00. Ctrl+F: resolveBranchHours */
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

function minutesToHmString(totalMin) {
  if (totalMin == null || !Number.isFinite(totalMin)) return null;
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
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

  const latestBookableMin = holdMinutes > 0 ? closeMin - holdMinutes : closeMin;
  if (resMin < openMin || resMin > latestBookableMin) {
    if (holdMinutes > 0) {
      return "Thời gian đặt bàn phải nằm trong giờ mở cửa và 2 tiếng trước giờ đóng cửa.";
    }
    return `Thời gian đặt bàn phải nằm trong giờ mở cửa (${formatBranchHoursDisplayVi(open, close)}).`;
  }
  return null;
}

/** [ĐẶT BÀN] Boolean wrapper cho validate giờ mở cửa. Ctrl+F: isWithinBranchHours */
function isWithinBranchHours(date, openTime, closeTime, options = {}) {
  return getBranchHoursValidationMessage(date, openTime, closeTime, options) == null;
}

/** [FE/BE DATE] Ghép ngày + giờ thành Date local để tránh lệch timezone khi chọn booking. Ctrl+F: buildLocalReservationDate */
function buildLocalReservationDate(datePart, timePart) {
  // Thiếu ngày hoặc giờ thì không ghép được.
  if (!datePart || !timePart) return null;
  // Cho phép nhận vào Date sẵn hoặc chuỗi/parse được thành Date.
  const d = datePart instanceof Date ? datePart : new Date(datePart);
  const t = timePart instanceof Date ? timePart : new Date(timePart);
  // Nếu một trong hai không parse được (Invalid Date) → null.
  if (Number.isNaN(d.getTime()) || Number.isNaN(t.getTime())) return null;
  // Lấy PHẦN NGÀY từ d và PHẦN GIỜ từ t, dựng Date theo giờ local.
  // Dùng constructor local (không phải UTC) để tránh lệch múi giờ khi người dùng chọn booking.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes(), 0, 0);
}

/** [HIỂN THỊ] Label giờ mở cửa cho UI chi nhánh. Ctrl+F: formatBranchHoursLabel */
function formatBranchHoursLabel(openTime, closeTime) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  return `${open} – ${close}`;
}

/** [HIỂN THỊ] Đổi HH:mm sang dạng đọc tiếng Việt (vd. 08:00 → 8h sáng, 24:00 → 12h đêm). */
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

/** [HIỂN THỊ] Đổi HH:mm sang dạng hiển thị UI (vd. 08:00 → 8 AM, 24:00 → 24:00 PM). */
function formatHmDisplayUi(timeText) {
  const hm = parseHm(timeText);
  if (!hm) return String(timeText || "").trim();
  const { h, min } = hm;
  const minText = String(min).padStart(2, "0");

  if (h === 24 || (h === 0 && min === 0)) {
    return min === 0 ? "24:00 PM" : `24:${minText} PM`;
  }
  if (h === 0) {
    return min === 0 ? "12 AM" : `12:${minText} AM`;
  }
  if (h < 12) {
    return min === 0 ? `${h} AM` : `${h}:${minText} AM`;
  }
  if (h === 12) {
    return min === 0 ? "12 PM" : `12:${minText} PM`;
  }
  const pmHour = h - 12;
  return min === 0 ? `${pmHour} PM` : `${pmHour}:${minText} PM`;
}

/** [HIỂN THỊ] Label giờ mở cửa tiếng Việt cho UI khách hàng. Ctrl+F: formatBranchHoursDisplayVi */
function formatBranchHoursDisplayVi(openTime, closeTime) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  return `${formatHmDisplayVi(open)} – ${formatHmDisplayVi(close)}`;
}

/** [ĐẶT BÀN] Label khung giờ được phép đặt bàn (trừ buffer giữ bàn). Ctrl+F: formatBranchHoursBookingWindowVi */
function formatBranchHoursBookingWindowVi(openTime, closeTime, holdMinutes = RESERVATION_HOLD_MINUTES) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  const closeHm = parseHm(close);
  const closeMin = hmToMinutes(closeHm);
  const latestMin = holdMinutes > 0 && closeMin != null ? closeMin - holdMinutes : closeMin;
  const latestHm = minutesToHmString(latestMin);
  return `${formatHmDisplayVi(open)} – ${formatHmDisplayVi(latestHm || close)}`;
}

/** [HIỂN THỊ] Label giờ mở cửa cho UI header/trang tĩnh. Ctrl+F: formatBranchHoursDisplayUi */
function formatBranchHoursDisplayUi(openTime, closeTime) {
  const { open, close } = resolveBranchHours(openTime, closeTime);
  return `${formatHmDisplayUi(open)} - ${formatHmDisplayUi(close)}`;
}

module.exports = {
  DEFAULT_OPEN_TIME,
  DEFAULT_CLOSE_TIME,
  RESERVATION_HOLD_MINUTES,
  parseHm,
  resolveBranchHours,
  hmToMinutes,
  minutesToHmString,
  getBranchHoursValidationMessage,
  isWithinBranchHours,
  buildLocalReservationDate,
  formatBranchHoursLabel,
  formatHmDisplayVi,
  formatHmDisplayUi,
  formatBranchHoursDisplayVi,
  formatBranchHoursBookingWindowVi,
  formatBranchHoursDisplayUi,
};
