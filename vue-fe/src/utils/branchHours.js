export function parseHm(timeText) {
  if (timeText == null || timeText === "") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(timeText).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return { h, min };
}

export function isWithinOpeningHours(date, openTime, closeTime) {
  if (!openTime || !closeTime || !date) return true;
  const openHm = parseHm(openTime);
  const closeHm = parseHm(closeTime);
  if (!openHm || !closeHm) return true;
  const resMin = date.getHours() * 60 + date.getMinutes();
  const openMin = openHm.h * 60 + openHm.min;
  const closeMin = closeHm.h * 60 + closeHm.min;
  return resMin >= openMin && resMin <= closeMin;
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
