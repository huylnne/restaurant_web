/**
 * ORDER STATUS (FE) — tái xuất bộ trạng thái đơn từ shared (dùng chung BE/FE) + hàm đổi status → nhãn tiếng Việt.
 */
import shared from "@shared/orderStatus.js";

export const ORDER_STATUS = shared.ORDER_STATUS;
export const normalizeOrderStatus = shared.normalizeOrderStatus;
export const isActiveOrderStatus = shared.isActiveOrderStatus;
export const isLegacyPreorderOrderStatus = shared.isLegacyPreorderOrderStatus;

/** Đổi mã trạng thái đơn thành nhãn hiển thị tiếng Việt; không khớp → trả nguyên status hoặc "-". */
export function getOrderStatusLabel(status) {
  const n = normalizeOrderStatus(status);
  const map = {
    [ORDER_STATUS.PENDING]: "Chờ xử lý",
    [ORDER_STATUS.CONFIRMED]: "Đã xác nhận",
    [ORDER_STATUS.PRE_ORDERED]: "Đặt món trước",
    [ORDER_STATUS.IN_PROGRESS]: "Đang phục vụ",
    [ORDER_STATUS.WAITING_PAYMENT]: "Chờ thanh toán",
    [ORDER_STATUS.COMPLETED]: "Hoàn tất",
    [ORDER_STATUS.CANCELLED]: "Đã hủy",
    [ORDER_STATUS.NO_SHOW]: "Không đến",
  };
  return map[n] ?? status ?? "-";
}
