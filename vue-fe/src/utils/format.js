/**
 * FORMAT HELPERS — hàm định dạng dùng chung ở nhiều component (tiền, giờ, ngày, header auth).
 */

/** Định dạng số thành tiền VND, ví dụ 120000 → "120.000 ₫". null/undefined → 0. */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount || 0
  );
}

/** Lấy phần giờ:phút (HH:mm) từ datetime, theo locale VN. Rỗng → "". */
export function formatTime(datetime) {
  if (!datetime) return "";
  return new Date(datetime).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Định dạng đầy đủ ngày + giờ theo locale VN. Rỗng → "". */
export function formatDateTime(datetime) {
  if (!datetime) return "";
  return new Date(datetime).toLocaleString("vi-VN");
}

/** Tạo header Authorization Bearer từ token trong localStorage để gọi API cần đăng nhập. */
export function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}
