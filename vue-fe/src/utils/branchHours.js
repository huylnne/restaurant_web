/**
 * BRANCH HOURS (FE) — tái xuất tiện ích giờ mở cửa từ shared (dùng chung BE/FE) và bọc lại 2 hàm
 * kiểm tra giờ đặt bàn hợp lệ, để component import gọn từ "@/utils/branchHours".
 */
import shared from "@shared/branchHours.js";

export const DEFAULT_OPEN_TIME = shared.DEFAULT_OPEN_TIME;
export const DEFAULT_CLOSE_TIME = shared.DEFAULT_CLOSE_TIME;
export const RESERVATION_HOLD_MINUTES = shared.RESERVATION_HOLD_MINUTES;
export const parseHm = shared.parseHm;
export const resolveBranchHours = shared.resolveBranchHours;
export const buildLocalReservationDate = shared.buildLocalReservationDate;
export const formatBranchHoursLabel = shared.formatBranchHoursLabel;
export const formatHmDisplayVi = shared.formatHmDisplayVi;
export const formatHmDisplayUi = shared.formatHmDisplayUi;
export const formatBranchHoursDisplayVi = shared.formatBranchHoursDisplayVi;
export const formatBranchHoursBookingWindowVi = shared.formatBranchHoursBookingWindowVi;
export const formatBranchHoursDisplayUi = shared.formatBranchHoursDisplayUi;

export function getOpeningHoursError(date, openTime, closeTime, options = {}) {
  return shared.getBranchHoursValidationMessage(date, openTime, closeTime, options);
}

export function isWithinOpeningHours(date, openTime, closeTime, options = {}) {
  return shared.isWithinBranchHours(date, openTime, closeTime, options);
}
