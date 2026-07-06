/**
 * UTIL REPORT DATE RANGE — helper SQL lọc ngày inclusive cho báo cáo.
 * Ctrl+F: report date range, hasDateRange, inclusiveDateClause
 * Dùng bởi: admin/report.service.js khi lọc startDate/endDate.
 */
/** [BÁO CÁO] Có lọc khoảng ngày (YYYY-MM-DD). Ctrl+F: hasDateRange */
function hasDateRange(startDate, endDate) {
  return Boolean(startDate && endDate);
}

/**
 * [BÁO CÁO] Lọc inclusive theo ngày: từ 00:00 startDate đến hết endDate.
 * Ctrl+F: inclusiveDateClause
 * @param {string} columnSql - ví dụ `o.created_at`
 */
function inclusiveDateClause(columnSql, params, startDate, endDate) {
  if (!hasDateRange(startDate, endDate)) return '';
  const i = params.length + 1;
  params.push(startDate, endDate);
  return ` AND ${columnSql} >= $${i}::date AND ${columnSql} < ($${i + 1}::date + INTERVAL '1 day')`;
}

module.exports = {
  hasDateRange,
  inclusiveDateClause,
};
