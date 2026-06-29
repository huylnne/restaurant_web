import shared from "@shared/branchHours.js";

export const DEFAULT_OPEN_TIME = shared.DEFAULT_OPEN_TIME;
export const DEFAULT_CLOSE_TIME = shared.DEFAULT_CLOSE_TIME;
export const RESERVATION_HOLD_MINUTES = shared.RESERVATION_HOLD_MINUTES;
export const parseHm = shared.parseHm;
export const resolveBranchHours = shared.resolveBranchHours;
export const buildLocalReservationDate = shared.buildLocalReservationDate;
export const formatBranchHoursLabel = shared.formatBranchHoursLabel;

export function getOpeningHoursError(date, openTime, closeTime, options = {}) {
  return shared.getBranchHoursValidationMessage(date, openTime, closeTime, options);
}

export function isWithinOpeningHours(date, openTime, closeTime, options = {}) {
  return shared.isWithinBranchHours(date, openTime, closeTime, options);
}
