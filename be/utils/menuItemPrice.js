/**
 * UTIL MENU ITEM PRICE — xác định giá bán tại thời điểm gọi món.
 * Ctrl+F: menu item price, resolveMenuItemUnitPrice, sale_price, giá món
 * Ưu tiên sale_price hợp lệ để bill và báo cáo doanh thu thống nhất.
 */
function resolveMenuItemUnitPrice(menuItem) {
  if (!menuItem) return 0;
  const price = Number(menuItem.price) || 0;
  const salePrice =
    menuItem.sale_price != null && menuItem.sale_price !== ""
      ? Number(menuItem.sale_price)
      : null;
  if (salePrice != null && salePrice > 0 && salePrice < price) {
    return salePrice;
  }
  return price;
}

module.exports = { resolveMenuItemUnitPrice };
