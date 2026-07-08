/**
 * BILL TOTALS (FE) — tính lại tổng bill ở phía frontend, ĐỒNG BỘ đúng logic với bill.service.js (backend)
 * để số hiển thị trước khi thanh toán khớp với hóa đơn cuối.
 */

/** Giá bán 1 món: ưu tiên sale_price nếu hợp lệ (>0 và < giá gốc), ngược lại dùng giá gốc. */
export function resolveMenuItemUnitPrice(menuItem) {
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

/**
 * Giá 1 dòng order item, giải quyết mâu thuẫn giữa giá lưu trong order (stored) và giá menu hiện tại:
 *  - Nếu có giá stored > 0:
 *      + nhưng stored >= giá gốc trong khi menu đang có sale (saleUnitPrice < listPrice)
 *        → ưu tiên giá sale hiện tại (tránh tính giá cao hơn thực tế đang khuyến mãi).
 *      + còn lại: tôn trọng giá đã chốt lúc gọi món.
 *  - Nếu không có stored: dùng giá sale hiện tại.
 */
function resolveOrderItemUnitPrice(orderItem) {
  const menu = orderItem?.MenuItem;
  const listPrice = Number(menu?.price) || 0;
  const saleUnitPrice = resolveMenuItemUnitPrice(menu);
  const stored =
    orderItem?.price != null && orderItem.price !== ""
      ? Number(orderItem.price)
      : null;

  if (stored != null && stored > 0) {
    if (listPrice > 0 && stored >= listPrice && saleUnitPrice < listPrice) {
      return saleUnitPrice;
    }
    return stored;
  }
  return saleUnitPrice;
}

/**
 * Tính tổng bill từ danh sách order item:
 *  - Gộp các dòng cùng món + cùng đơn giá lại (aggregated) để hiển thị gọn.
 *  - Cộng dồn: total_amount (sau giảm), subtotal (trước giảm), discount_total (phần được giảm).
 */
export function computeBillTotals(orderItems) {
  const aggregated = {};
  let totalAmount = 0;
  let subtotalBeforeDiscount = 0;
  let discountTotal = 0;

  (orderItems || []).forEach((oi) => {
    const menu = oi.MenuItem;
    if (!menu) return;

    const unitPrice = resolveOrderItemUnitPrice(oi);
    const originalUnitPrice = Number(menu.price) || unitPrice;
    // Khóa gộp gồm cả đơn giá → cùng món nhưng khác giá (vd 1 phần mua lúc sale) vẫn tách dòng riêng.
    const key = `${menu.item_id}:${unitPrice}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        item_id: menu.item_id,
        name: menu.name,
        unit_price: unitPrice,
        original_unit_price: originalUnitPrice,
        quantity: 0,
      };
    }
    aggregated[key].quantity += Number(oi.quantity) || 0;
  });

  const items = Object.values(aggregated).map((it) => {
    const quantity = it.quantity;
    const lineTotal = it.unit_price * quantity;
    const lineOriginalTotal = it.original_unit_price * quantity;
    const lineDiscount =
      it.original_unit_price > it.unit_price ? lineOriginalTotal - lineTotal : 0;

    totalAmount += lineTotal;
    subtotalBeforeDiscount += lineOriginalTotal;
    discountTotal += lineDiscount;

    return {
      item_id: it.item_id,
      name: it.name,
      unit_price: it.unit_price,
      original_unit_price: it.original_unit_price,
      quantity,
      line_total: lineTotal,
      line_discount: lineDiscount,
      has_discount: lineDiscount > 0,
    };
  });

  return {
    items,
    subtotal_before_discount: subtotalBeforeDiscount,
    discount_total: discountTotal,
    total_amount: totalAmount,
  };
}

export function collectOrderItemsFromRow(row) {
  if (row?.OrderItems?.length) return row.OrderItems;
  if (row?.Orders?.length) {
    return row.Orders.flatMap((order) => order.OrderItems || []);
  }
  return [];
}

export function computeBillTotalsForRow(row) {
  return computeBillTotals(collectOrderItemsFromRow(row));
}
