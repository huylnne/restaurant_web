const { Op } = require("sequelize");
const db = require("../models/db");
const { MenuItem } = db;
const reportService = require("./admin/report.service");

function formatMenuItem(row) {
  const price = Number(row.price) || 0;
  const salePrice =
    row.sale_price != null && row.sale_price !== "" ? Number(row.sale_price) : null;
  const onSale = salePrice != null && salePrice > 0 && salePrice < price;
  const displayPrice = onSale ? salePrice : price;
  const discountPercent = onSale
    ? Math.round(((price - salePrice) / price) * 100)
    : null;

  return {
    item_id: row.item_id,
    branch_id: row.branch_id,
    name: row.name,
    description: row.description,
    category: row.category,
    image_url: row.image_url,
    price,
    sale_price: onSale ? salePrice : null,
    display_price: displayPrice,
    is_on_sale: onSale,
    discount_percent: discountPercent,
    total_sold: row.total_sold != null ? Number(row.total_sold) : undefined,
  };
}

async function getOnSaleItems(branchId, limit = 8) {
  const rows = await MenuItem.findAll({
    where: {
      branch_id: branchId,
      is_active: true,
      sale_price: { [Op.not]: null },
      [Op.and]: db.sequelize.literal("sale_price < price"),
    },
    order: [
      [db.sequelize.literal("(price - sale_price) / NULLIF(price, 0)"), "DESC"],
      ["name", "ASC"],
    ],
    limit,
  });
  return rows.map((r) => formatMenuItem(r.get({ plain: true })));
}

async function getBestsellers(branchId, limit = 8, days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  let rows = await reportService.getTopSellingItems(branchId, limit, startDate, endDate);

  if (!rows.length) {
    rows = await reportService.getTopSellingItems(branchId, limit);
  }

  if (rows.length) {
    const ids = rows.map((r) => r.item_id);
    const menuRows = await MenuItem.findAll({
      where: { item_id: { [Op.in]: ids }, branch_id: branchId },
    });
    const byId = Object.fromEntries(
      menuRows.map((m) => [m.item_id, m.get({ plain: true })])
    );
    return rows.map((r) =>
      formatMenuItem({
        ...byId[r.item_id],
        ...r,
        total_sold: Number(r.total_sold) || 0,
      })
    );
  }

  const fallback = await MenuItem.findAll({
    where: { branch_id: branchId, is_active: true, is_featured: true },
    order: [["created_at", "DESC"]],
    limit,
  });

  if (fallback.length) {
    return fallback.map((r) => formatMenuItem(r.get({ plain: true })));
  }

  const anyActive = await MenuItem.findAll({
    where: { branch_id: branchId, is_active: true },
    order: [["created_at", "DESC"]],
    limit,
  });
  return anyActive.map((r) => formatMenuItem(r.get({ plain: true })));
}

async function getHighlights(branchId = 1, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 8, 1), 20);
  const days = Math.min(Math.max(Number(options.days) || 30, 7), 365);

  const [bestsellers, onSale] = await Promise.all([
    getBestsellers(branchId, limit, days),
    getOnSaleItems(branchId, limit),
  ]);

  return {
    branch_id: branchId,
    period_days: days,
    bestsellers,
    on_sale: onSale,
  };
}

module.exports = {
  getHighlights,
  formatMenuItem,
};
