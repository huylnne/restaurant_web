/**
 * UTIL BRANCH HOURS (BACKEND) — validate giờ đặt theo timezone app Asia/Ho_Chi_Minh.
 * Ctrl+F: branchHours util, APP_TZ, getMinutesInAppTz, giờ mở cửa
 * Dùng bởi: reservation.controller khi kiểm giờ đặt bàn.
 */
const shared = require("../shared/branchHours");

const APP_TZ = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";

/** [TIMEZONE] Lấy tổng phút trong ngày theo timezone vận hành, tránh lệch giờ server. Ctrl+F: getMinutesInAppTz */
function getMinutesInAppTz(date) {
  // Chỉ nhận Date hợp lệ; sai kiểu hoặc Invalid Date → null.
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  // Dùng Intl để lấy giờ/phút ĐÚNG theo múi giờ vận hành (APP_TZ), không phụ thuộc giờ server.
  // hour12:false để lấy dạng 24h; formatToParts tách sẵn từng thành phần (hour, minute...).
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  // Tìm phần "hour" và "minute" trong mảng parts rồi ép về số.
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  // Nếu vì lý do gì không lấy được số hợp lệ → null.
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  // Quy về tổng số phút trong ngày để so sánh giờ mở/đóng cửa cho tiện.
  return hour * 60 + minute;
}

/** [ĐẶT BÀN] Kiểm tra giờ đặt có nằm trong giờ mở cửa chi nhánh theo APP_TZ không. Ctrl+F: isWithinBranchHours */
function isWithinBranchHours(reservationDate, openTime, closeTime, options = {}) {
  return shared.isWithinBranchHours(reservationDate, openTime, closeTime, {
    ...options,
    getMinutes: getMinutesInAppTz,
  });
}

/** [ĐẶT BÀN] Trả về message lỗi giờ mở cửa theo timezone app. Ctrl+F: getBranchHoursValidationMessage */
function getBranchHoursValidationMessage(reservationDate, openTime, closeTime, options = {}) {
  return shared.getBranchHoursValidationMessage(reservationDate, openTime, closeTime, {
    ...options,
    getMinutes: getMinutesInAppTz,
  });
}

module.exports = {
  APP_TZ,
  ...shared,
  getMinutesInAppTz,
  isWithinBranchHours,
  getBranchHoursValidationMessage,
};
