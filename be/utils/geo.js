/**
 * UTIL GEO — tính khoảng cách chi nhánh gần khách theo tọa độ lat/lng.
 * Ctrl+F: geo util, distanceKm, normalizeCoords, chi nhánh gần
 * Luồng demo: Phần 2 — xem chi nhánh, có thể sắp xếp chi nhánh gần khách.
 */
/** [VỊ TRÍ] Khoảng cách Haversine (km) giữa hai điểm WGS84. Ctrl+F: distanceKm */
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** [VỊ TRÍ] Parse query lat/lng thành number hoặc null. Ctrl+F: parseCoord */
function parseCoord(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** [VỊ TRÍ] Kiểm tra tọa độ có nằm trong bounds Việt Nam tương đối không. Ctrl+F: isInVietnamBounds */
function isInVietnamBounds(lat, lng) {
  return lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
}

/** [VỊ TRÍ] Đảo lat/lng nếu rơi ngoài VN nhưng hoán vị thì hợp lệ. Ctrl+F: normalizeCoords */
function normalizeCoords(lat, lng) {
  if (lat == null || lng == null) return { lat, lng };
  if (isInVietnamBounds(lat, lng)) return { lat, lng };
  if (isInVietnamBounds(lng, lat)) return { lat: lng, lng: lat };
  return { lat, lng };
}

module.exports = { distanceKm, parseCoord, normalizeCoords, isInVietnamBounds };
