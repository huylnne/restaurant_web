/**
 * UTIL MENU ITEM PRICE — xác định giá bán tại thời điểm gọi món.
 * Ctrl+F: menu item price, resolveMenuItemUnitPrice, sale_price, giá món
 * Ưu tiên sale_price hợp lệ để bill và báo cáo doanh thu thống nhất.
 */
function resolveMenuItemUnitPrice(menuItem) {
  // Không có món → giá 0 (phòng thủ, tránh NaN xuống bill).
  if (!menuItem) return 0;
  // Giá gốc; nếu parse lỗi thì coi như 0.
  const price = Number(menuItem.price) || 0;
  // Giá khuyến mãi: chỉ tính khi có giá trị (khác null và khác chuỗi rỗng).
  const salePrice =
    menuItem.sale_price != null && menuItem.sale_price !== ""
      ? Number(menuItem.sale_price)
      : null;
  // Chỉ áp giá sale khi nó DƯƠNG và THẬT SỰ rẻ hơn giá gốc (tránh sale = 0 hay sale cao hơn).
  if (salePrice != null && salePrice > 0 && salePrice < price) {
    return salePrice;
  }
  // Mặc định dùng giá gốc.
  return price;
}

module.exports = { resolveMenuItemUnitPrice };
