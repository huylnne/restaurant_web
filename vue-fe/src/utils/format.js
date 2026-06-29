export function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount || 0
  );
}

export function formatTime(datetime) {
  if (!datetime) return "";
  return new Date(datetime).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(datetime) {
  if (!datetime) return "";
  return new Date(datetime).toLocaleString("vi-VN");
}

export function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}
