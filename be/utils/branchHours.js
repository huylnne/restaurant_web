/**
 * UTIL BRANCH HOURS (BACKEND) — validate giờ đặt theo timezone app Asia/Ho_Chi_Minh.
 * Ctrl+F: branchHours util, APP_TZ, getMinutesInAppTz, giờ mở cửa
 * Dùng bởi: reservation.controller khi kiểm giờ đặt bàn.
 */
const shared = require("../shared/branchHours");

const APP_TZ = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";

/** [TIMEZONE] Lấy tổng phút trong ngày theo timezone vận hành, tránh lệch giờ server. Ctrl+F: getMinutesInAppTz */
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
