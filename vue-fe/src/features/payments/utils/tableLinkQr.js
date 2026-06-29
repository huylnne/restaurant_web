import QRCode from "qrcode";

export const QR_IMAGE_OPTIONS = { margin: 1, width: 260 };

export function buildTableQrLink(qrToken, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const base = String(origin).replace(/\/+$/, "");
  return qrToken ? `${base}/t/${qrToken}` : "";
}

export async function createQrDataUrl(content, options = QR_IMAGE_OPTIONS) {
  return QRCode.toDataURL(content, options);
}
