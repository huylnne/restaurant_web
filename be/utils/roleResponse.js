/**
 * Filter API response theo role. Waiter/kitchen không được xem dữ liệu tài chính.
 * Admin: full data. Waiter/kitchen: chỉ nghiệp vụ (bàn, món, đơn, không doanh thu/lợi nhuận).
 */
const ADMIN = 'admin';

function isAdmin(role) {
  return role === ADMIN;
}

/**
 * Dashboard summary: bỏ doanh thu, chỉ giữ số lượng đơn/khách/món cho waiter/kitchen.
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
 * Top dishes: bỏ revenue cho waiter/kitchen.
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
 * Weekly revenue: trả về mảng rỗng cho waiter/kitchen.
 */
function filterWeeklyRevenueForRole(role, data) {
  if (isAdmin(role)) return data;
  return [];
}

/**
 * Danh sách bàn: bỏ totalRevenue trên từng bàn cho waiter/kitchen.
 */
function filterTableListForRole(role, tables) {
  if (!Array.isArray(tables)) return tables;
  if (isAdmin(role)) return tables;
  return tables.map((t) => {
    const { totalRevenue, ...rest } = t;
    return rest;
  });
}

/**
 * Table summary: bỏ currentRevenue cho waiter/kitchen.
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
