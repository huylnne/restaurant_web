const shared = require("../shared/branchHours");

const APP_TZ = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";

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

function isWithinBranchHours(reservationDate, openTime, closeTime, options = {}) {
  return shared.isWithinBranchHours(reservationDate, openTime, closeTime, {
    ...options,
    getMinutes: getMinutesInAppTz,
  });
}

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
