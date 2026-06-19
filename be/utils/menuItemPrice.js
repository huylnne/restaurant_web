/**
 * Giá bán tại thời điểm gọi món (ưu tiên sale_price khi có khuyến mãi hợp lệ).
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
