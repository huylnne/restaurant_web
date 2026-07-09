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
  // holdMinutes: số phút giữ bàn sau giờ đến (mặc định 0 = không kiểm tra buffer).
  // getMinutes: hàm tùy chọn để lấy "phút trong ngày" từ date (dùng khi cần xử lý timezone riêng).
  const { holdMinutes = 0, getMinutes } = options;
  // Không có ngày giờ → coi như dữ liệu không hợp lệ.
  if (!date) return "Thời gian đặt bàn không hợp lệ.";
  // Lấy giờ mở/đóng thật của chi nhánh, thiếu thì rơi về mặc định 08:00–24:00.
  const { open, close } = resolveBranchHours(openTime, closeTime);
  // Tách giờ/phút của mốc mở và đóng cửa.
  const openHm = parseHm(open);
  const closeHm = parseHm(close);
  // Nếu cấu hình giờ chi nhánh hỏng (parse ra null) → báo lỗi cấu hình.
  if (!openHm || !closeHm) return "Giờ mở cửa chi nhánh chưa được cấu hình hợp lệ.";

  // Quy đổi thời điểm đặt bàn thành "số phút kể từ 00:00" để so sánh số học cho dễ.
  const resMin =
    typeof getMinutes === "function"
      ? getMinutes(date) // dùng hàm tùy biến nếu được truyền vào
      : date.getHours() * 60 + date.getMinutes(); // mặc định lấy theo giờ local
  const openMin = hmToMinutes(openHm);
  const closeMin = hmToMinutes(closeHm);

  // Bất kỳ mốc phút nào không tính được → dữ liệu không hợp lệ.
  if (resMin == null || openMin == null || closeMin == null) {
    return "Thời gian đặt bàn không hợp lệ.";
  }
  // Đặt trước giờ mở hoặc sau giờ đóng → ngoài giờ phục vụ.
  if (resMin < openMin || resMin > closeMin) {
    return `Thời gian đặt bàn phải nằm trong giờ mở cửa (${formatBranchHoursDisplayVi(open, close)}).`;
  }
  // Nếu có yêu cầu giữ bàn: giờ đến + thời lượng giữ mà vượt giờ đóng cửa → từ chối.
  if (holdMinutes > 0 && resMin + holdMinutes > closeMin) {
    const holdHours = holdMinutes / 60; // đổi phút → giờ để hiển thị cho dễ đọc
    return `Giờ đặt quá gần giờ đóng cửa. Hệ thống giữ bàn ${holdHours} giờ sau giờ đến — vui lòng chọn sớm hơn.`;
  }
  // Qua hết các rào chắn → hợp lệ, không có thông báo lỗi.
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

/** [HIỂN THỊ] Label giờ mở cửa tiếng Việt cho UI khách hàng. Ctrl+F: formatBranchHoursDisplayVi */
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
