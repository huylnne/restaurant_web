/** Bật chỉ khi cần test bằng một tọa độ giả lập. */
export const USE_FIXED_USER_LOCATION = true;

/** Vị trí demo mặc định — bỏ qua GPS trình duyệt khi USE_FIXED_USER_LOCATION = true. */
export const FIXED_USER_LOCATION = {
  lat: 20.833045053382488,
  lng: 105.84194514066971,
  label: "Vị trí demo",
};

/** Tâm khu vực — dùng khi chọn thủ công Hà Nội / TP.HCM */
export const REGION_PRESETS = {
  hanoi: { ...FIXED_USER_LOCATION },
  hcm: { lat: 10.7769, lng: 106.7009, label: "TP.HCM" },
};

/** Việt Nam: vĩ độ ~8–24, kinh độ ~102–110 */
export function isInVietnamBounds(lat, lng) {
  return lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
}

/** Sửa lat/lng bị đảo (một số API/trình duyệt trả nhầm) */
export function normalizeCoords(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { lat, lng };
  if (isInVietnamBounds(lat, lng)) return { lat, lng };
  if (isInVietnamBounds(lng, lat)) return { lat: lng, lng: lat };
  return { lat, lng };
}

/** Khoảng cách tới chi nhánh gần nhất có vẻ sai (IP định vị lệch vùng) */
export function isSuspiciousDistanceKm(km) {
  return km != null && Number.isFinite(km) && km > 200;
}

/**
 * Lấy vị trí người dùng.
 * @param {object} options
 * @param {boolean} options.forceGps — bỏ qua vị trí cố định, dùng GPS trình duyệt
 */
export function getUserPosition(options = {}) {
  const {
    forceGps = false,
    timeout = 12000,
    maximumAge = 0,
    enableHighAccuracy = true,
  } = options;

  if (USE_FIXED_USER_LOCATION && !forceGps) {
    return Promise.resolve({
      lat: FIXED_USER_LOCATION.lat,
      lng: FIXED_USER_LOCATION.lng,
      accuracy: 0,
      source: "fixed",
      label: FIXED_USER_LOCATION.label,
    });
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Trình duyệt không hỗ trợ định vị"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { lat, lng } = normalizeCoords(pos.coords.latitude, pos.coords.longitude);
        resolve({
          lat,
          lng,
          accuracy: pos.coords.accuracy,
          source: "gps",
          label: null,
          rawLat: pos.coords.latitude,
          rawLng: pos.coords.longitude,
        });
      },
      (err) => {
        const messages = {
          1: "Bạn đã từ chối chia sẻ vị trí. Vui lòng bật quyền vị trí để xem chi nhánh gần nhất.",
          2: "Không xác định được vị trí. Kiểm tra GPS hoặc kết nối mạng.",
          3: "Hết thời gian chờ định vị. Thử lại.",
        };
        reject(new Error(messages[err.code] || err.message || "Không lấy được vị trí"));
      },
      { timeout, maximumAge, enableHighAccuracy }
    );
  });
}

export function formatDistanceKm(km) {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/**
 * Link Google Maps: từ vị trí bạn (origin) → chi nhánh (destination).
 * @param {number} destLat - vĩ độ chi nhánh
 * @param {number} destLng - kinh độ chi nhánh
 * @param {{ lat: number, lng: number } | null} [origin] - điểm xuất phát từ vị trí người dùng
 */
export function mapsDirectionsUrl(destLat, destLng, origin = null) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destLat},${destLng}`,
  });
  if (origin?.lat != null && origin?.lng != null) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
