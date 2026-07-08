/**
 * CONFIG API — địa chỉ gốc của backend cho toàn bộ lời gọi API ở frontend.
 * Ưu tiên biến môi trường VITE_API_URL (đặt khi build/deploy), nếu không có dùng DEFAULT_API_ORIGIN.
 */
const DEFAULT_API_ORIGIN = "https://api.hl-restaurant.com";

// Bỏ dấu "/" thừa ở cuối để khi ghép path không bị "//".
export const API_ORIGIN = (import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN).replace(/\/+$/, "");

/** Ghép origin + path thành URL đầy đủ, tự thêm "/" đầu path nếu thiếu. Ví dụ apiUrl("api/menu"). */
export const apiUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
};
