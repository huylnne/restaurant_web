/**
 * UTIL REVENUE SQL — biểu thức SQL doanh thu theo dòng order_item, đồng bộ bill.service.js/menuItemPrice.js.
 * Ctrl+F: revenue sql, orderItemUnitPriceExpr, sale_price, báo cáo doanh thu
 * Dùng giá bán thực tế (sale_price, oi.price), không dùng mi.price gốc khi có giảm giá.
 */
function orderItemUnitPriceExpr({ oiAlias = 'oi', miAlias = 'mi' } = {}) {
  const oi = oiAlias;
  const mi = miAlias;
  return `CASE
    WHEN ${oi}.price IS NOT NULL AND ${oi}.price > 0
         AND ${mi}.price > 0 AND ${oi}.price >= ${mi}.price
         AND ${mi}.sale_price IS NOT NULL AND ${mi}.sale_price > 0 AND ${mi}.sale_price < ${mi}.price
      THEN ${mi}.sale_price
    WHEN ${oi}.price IS NOT NULL AND ${oi}.price > 0
      THEN ${oi}.price
    WHEN ${mi}.sale_price IS NOT NULL AND ${mi}.sale_price > 0
         AND ${mi}.sale_price < COALESCE(${mi}.price, 0)
      THEN ${mi}.sale_price
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
