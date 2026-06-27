const APP_TZ = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";

function parseHm(timeText) {
  if (timeText == null || timeText === "") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(timeText).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
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

function isWithinBranchHours(reservationDate, openTime, closeTime) {
  if (!openTime || !closeTime) return true;
  const resMin = getMinutesInAppTz(reservationDate);
  const openMin = parseHm(openTime);
  const closeMin = parseHm(closeTime);
  if (resMin == null || openMin == null || closeMin == null) return true;
  return resMin >= openMin && resMin <= closeMin;
}

module.exports = {
  APP_TZ,
  parseHm,
  getMinutesInAppTz,
  isWithinBranchHours,
};
