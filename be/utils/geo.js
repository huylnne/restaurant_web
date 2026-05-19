/** Khoảng cách Haversine (km) giữa hai điểm WGS84 */
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

function parseCoord(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function isInVietnamBounds(lat, lng) {
  return lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
}

/** Đảo lat/lng nếu rơi ngoài VN nhưng hoán vị thì hợp lệ */
function normalizeCoords(lat, lng) {
  if (lat == null || lng == null) return { lat, lng };
  if (isInVietnamBounds(lat, lng)) return { lat, lng };
  if (isInVietnamBounds(lng, lat)) return { lat: lng, lng: lat };
  return { lat, lng };
}

module.exports = { distanceKm, parseCoord, normalizeCoords, isInVietnamBounds };
