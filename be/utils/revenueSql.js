/**
 * UTIL REVENUE SQL — biểu thức SQL doanh thu theo dòng order_item, đồng bộ bill.service.js/menuItemPrice.js.
 * Ctrl+F: revenue sql, orderItemUnitPriceExpr, sale_price, báo cáo doanh thu
 * Dùng giá bán thực tế (sale_price, oi.price), không dùng mi.price gốc khi có giảm giá.
 */
function orderItemUnitPriceExpr({ oiAlias = 'oi', miAlias = 'mi' } = {}) {
  // oi = bảng order_items (giá đã chốt lúc gọi món), mi = bảng menu_items (giá/khuyến mãi hiện tại).
  const oi = oiAlias;
  const mi = miAlias;
  // Chọn "đơn giá thực tế" của 1 món theo thứ tự ưu tiên (CASE xét từ trên xuống):
  return `CASE
    -- 1) order_item lưu giá gốc (>= giá menu) NHƯNG menu đang có sale hợp lệ → ưu tiên giá sale
    --    (xử lý đơn cũ chốt giá gốc trước khi có khuyến mãi).
    WHEN ${oi}.price IS NOT NULL AND ${oi}.price > 0
         AND ${mi}.price > 0 AND ${oi}.price >= ${mi}.price
         AND ${mi}.sale_price IS NOT NULL AND ${mi}.sale_price > 0 AND ${mi}.sale_price < ${mi}.price
      THEN ${mi}.sale_price
    -- 2) Có giá đã chốt trên order_item → dùng chính giá đó (đúng số tiền khách trả).
    WHEN ${oi}.price IS NOT NULL AND ${oi}.price > 0
      THEN ${oi}.price
    -- 3) order_item không có giá nhưng menu đang sale hợp lệ → dùng giá sale.
    WHEN ${mi}.sale_price IS NOT NULL AND ${mi}.sale_price > 0
         AND ${mi}.sale_price < COALESCE(${mi}.price, 0)
      THEN ${mi}.sale_price
    -- 4) Còn lại → dùng giá menu gốc (COALESCE tránh NULL).
    ELSE COALESCE(${mi}.price, 0)
  END`;
}

/** [BÁO CÁO] Doanh thu một dòng món = quantity * unit price. Ctrl+F: orderItemLineRevenueExpr */
function orderItemLineRevenueExpr(opts) {
  const oi = opts?.oiAlias ?? 'oi';
  return `${oi}.quantity * (${orderItemUnitPriceExpr(opts)})`;
}

/** [BÁO CÁO] SUM doanh thu món, dùng cho dashboard/report/table summary. Ctrl+F: orderItemLineRevenueSumExpr */
function orderItemLineRevenueSumExpr(opts) {
  return `COALESCE(SUM(${orderItemLineRevenueExpr(opts)}), 0)`;
}

module.exports = {
  orderItemUnitPriceExpr,
  orderItemLineRevenueExpr,
  orderItemLineRevenueSumExpr,
};
