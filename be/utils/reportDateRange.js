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
  // Không đủ cả 2 mốc ngày → không thêm điều kiện (trả chuỗi rỗng).
  if (!hasDateRange(startDate, endDate)) return '';
  // i = số thứ tự tham số kế tiếp trong mảng params (dùng cho placeholder $i của Postgres).
  const i = params.length + 1;
  // Đẩy 2 giá trị ngày vào params theo đúng thứ tự placeholder.
  params.push(startDate, endDate);
  // >= startDate (00:00) VÀ < endDate + 1 ngày → bao trọn CẢ ngày endDate (inclusive) mà vẫn dùng so sánh nửa mở.
  return ` AND ${columnSql} >= $${i}::date AND ${columnSql} < ($${i + 1}::date + INTERVAL '1 day')`;
}

module.exports = {
  hasDateRange,
  inclusiveDateClause,
};
