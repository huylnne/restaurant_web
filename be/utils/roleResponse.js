/**
 * UTIL ROLE RESPONSE — lọc API response theo role để tránh lộ dữ liệu tài chính.
 * Ctrl+F: role response, filterSummaryForRole, waiter kitchen không xem doanh thu
 * Admin: full data. Waiter/kitchen: chỉ nghiệp vụ (bàn, món, đơn, không doanh thu/lợi nhuận).
 */
const ADMIN = 'admin';

/** [PHÂN QUYỀN] Role admin được xem full dữ liệu. Ctrl+F: isAdmin */
function isAdmin(role) {
  return role === ADMIN;
}

/**
 * [DASHBOARD] Bỏ doanh thu, chỉ giữ số lượng đơn/khách/món cho waiter/kitchen.
 * Ctrl+F: filterSummaryForRole
 */
function filterSummaryForRole(role, data) {
  if (!data) return data;
  if (isAdmin(role)) return data;
  return {
    totalOrders: data.totalOrders,
    yesterdayOrders: data.yesterdayOrders,
    totalCustomers: data.totalCustomers,
    yesterdayCustomers: data.yesterdayCustomers,
    totalItems: data.totalItems,
    yesterdayItems: data.yesterdayItems,
    // Không trả về: todayRevenue, yesterdayRevenue
  };
}

/**
 * [DASHBOARD] Top dishes: bỏ revenue cho waiter/kitchen.
 * Ctrl+F: filterTopDishesForRole
 */
function filterTopDishesForRole(role, list) {
  if (!Array.isArray(list)) return list;
  if (isAdmin(role)) return list;
  return list.map((item) => ({
    name: item.name,
    category: item.category,
    soldCount: item.soldCount,
    // bỏ revenue
  }));
}

/**
 * [DASHBOARD] Weekly revenue: trả về mảng rỗng cho waiter/kitchen.
 * Ctrl+F: filterWeeklyRevenueForRole
 */
function filterWeeklyRevenueForRole(role, data) {
  if (isAdmin(role)) return data;
  return [];
}

/**
 * [SƠ ĐỒ BÀN] Admin/waiter được xem totalRevenue để thanh toán; kitchen không thấy tiền.
 * Ctrl+F: filterTableListForRole
 */
function filterTableListForRole(role, tables) {
  if (!Array.isArray(tables)) return tables;
  if (isAdmin(role) || role === 'waiter') return tables;
  return tables.map((t) => {
    const { totalRevenue, ...rest } = t;
    return rest;
  });
}

/**
 * [SƠ ĐỒ BÀN] Table summary: bỏ currentRevenue cho waiter/kitchen.
 * Ctrl+F: filterTableSummaryForRole
 */
function filterTableSummaryForRole(role, data) {
  if (!data) return data;
  if (isAdmin(role)) return data;
  const { currentRevenue, ...rest } = data;
  return rest;
}

module.exports = {
  filterSummaryForRole,
  filterTopDishesForRole,
  filterWeeklyRevenueForRole,
  filterTableListForRole,
  filterTableSummaryForRole,
  isAdmin,
};
