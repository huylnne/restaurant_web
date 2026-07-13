/**
 * UTIL WORK SHIFT — validate giờ ca làm và kiểm tra nhân viên đang trong ca.
 * Ctrl+F: workShiftTime, isWithinShift, parseShiftMinutes
 */

/** Chuyển "HH:MM" → số phút từ 00:00. */
function parseShiftMinutes(timeStr) {
  const raw = String(timeStr || "").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Validate cặp giờ ca: đúng định dạng và end > start. */
function validateShiftTimes(startTime, endTime) {
  const start = parseShiftMinutes(startTime);
  const end = parseShiftMinutes(endTime);
  if (start == null || end == null) {
    const err = new Error("Giờ ca làm phải theo định dạng HH:MM");
    err.code = "INVALID_SHIFT_TIME";
    throw err;
  }
  if (end <= start) {
    const err = new Error("Giờ kết thúc ca phải sau giờ bắt đầu");
    err.code = "INVALID_SHIFT_RANGE";
    throw err;
  }
  return { start, end };
}

/** Kiểm tra thời điểm `at` (Date) có nằm trong ca không. */
function isWithinShift({ shift_date, start_time, end_time }, at = new Date()) {
  const dateStr = String(shift_date).slice(0, 10);
  const atDateStr = at.toISOString().slice(0, 10);
  if (dateStr !== atDateStr) return false;

  const start = parseShiftMinutes(start_time);
  const end = parseShiftMinutes(end_time);
  if (start == null || end == null) return false;

  const nowMinutes = at.getHours() * 60 + at.getMinutes();
  return nowMinutes >= start && nowMinutes < end;
}

module.exports = {
  parseShiftMinutes,
  validateShiftTimes,
  isWithinShift,
};
