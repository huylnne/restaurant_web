/**
 * TABLE LINK QR (FE) — tạo link QR bàn (/t/{token}) và render nội dung bất kỳ thành ảnh QR (data URL).
 */
import QRCode from "qrcode";

export const QR_IMAGE_OPTIONS = { margin: 1, width: 260 }; // cấu hình ảnh QR mặc định

/** Ghép URL public của bàn: {origin}/t/{qrToken}. Không có token → chuỗi rỗng. */
export function buildTableQrLink(qrToken, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const base = String(origin).replace(/\/+$/, ""); // bỏ "/" thừa cuối origin
  return qrToken ? `${base}/t/${qrToken}` : "";
}

/** Chuyển 1 chuỗi nội dung thành ảnh QR dạng data URL (dùng cho thẻ <img :src>). */
export async function createQrDataUrl(content, options = QR_IMAGE_OPTIONS) {
  return QRCode.toDataURL(content, options);
}
