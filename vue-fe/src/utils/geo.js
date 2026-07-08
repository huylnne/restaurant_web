/**
 * USE_FIXED_USER_LOCATION = cờ bật/tắt chế độ dùng vị trí cố định.
 *  - true  : luôn trả về FIXED_USER_LOCATION, KHÔNG hỏi GPS trình duyệt (tiện demo/bảo vệ đồ án).
 *  - false : gọi navigator.geolocation để lấy GPS thật của thiết bị.
 */
export const USE_FIXED_USER_LOCATION = true;

/**
 * FIXED_USER_LOCATION = tọa độ mặc định giả lập "vị trí người dùng".
 * Đang đặt tại Đại học Bách Khoa Hà Nội (ĐHBK Hà Nội) để demo tính năng "chi nhánh gần bạn".
 *  - lat   : vĩ độ (khoảng 21.0049 — cổng chính C1 ĐHBK Hà Nội).
 *  - lng   : kinh độ (khoảng 105.8438).
 *  - label : nhãn hiển thị cho người dùng biết đây là vị trí nào.
 */
export const FIXED_USER_LOCATION = {
  lat: 21.004999,
  lng: 105.843807,
  label: "ĐHBK Hà Nội",
};

/**
 * REGION_PRESETS = các "tâm khu vực" định sẵn, dùng khi người dùng chọn tay Hà Nội / TP.HCM
 * thay vì để hệ thống tự định vị.
 *  - hanoi : mượn lại FIXED_USER_LOCATION (ĐHBK Hà Nội) làm tâm khu vực Hà Nội.
 *  - hcm   : tâm khu vực TP.HCM (khu vực Bến Thành, Quận 1).
 */
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
