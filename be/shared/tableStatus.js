/**
 * UC10 – Trạng thái bàn (4 giá trị): available | pre-ordered | occupied | cleaning
 */

const TABLE_STATUS = {
  AVAILABLE: "available",
  PRE_ORDERED: "pre-ordered",
  OCCUPIED: "occupied",
  CLEANING: "cleaning",
};

const TABLE_STATUS_VALUES = Object.values(TABLE_STATUS);

const STATUS_ALIASES = {
  reserved: TABLE_STATUS.PRE_ORDERED,
};

function normalizeTableStatus(status) {
  if (!status) return status;
  const s = String(status).trim().toLowerCase();
  return STATUS_ALIASES[s] || s;
}

function isValidTableStatus(status) {
  return TABLE_STATUS_VALUES.includes(normalizeTableStatus(status));
}

function isBookableTableStatus(status) {
  return normalizeTableStatus(status) === TABLE_STATUS.AVAILABLE;
}

function isCheckInableTableStatus(status) {
  const s = normalizeTableStatus(status);
  return s === TABLE_STATUS.AVAILABLE || s === TABLE_STATUS.PRE_ORDERED;
}

function shouldEndTableSession(status) {
  const s = normalizeTableStatus(status);
  return s === TABLE_STATUS.AVAILABLE || s === TABLE_STATUS.CLEANING;
}

module.exports = {
  TABLE_STATUS,
  TABLE_STATUS_VALUES,
  normalizeTableStatus,
  isValidTableStatus,
  isBookableTableStatus,
  isCheckInableTableStatus,
  shouldEndTableSession,
};
