/**
 * UTIL ENSURE BRANCH MENUS — sao chép thực đơn mẫu (branch 1) sang chi nhánh chưa có món.
 * Ctrl+F: ensureBranchMenus, ensureMenuForEmptyBranches, sao chép thực đơn
 * Mỗi chi nhánh có bản menu riêng (branch_id) — không dùng chung 1 catalog toàn hệ thống.
 */
const SOURCE_BRANCH_ID = 1;

/** [SEED/MIGRATION] Clone menu branch 1 cho các chi nhánh active chưa có menu_items. Ctrl+F: ensureMenuForEmptyBranches */
async function ensureMenuForEmptyBranches(sequelize) {
  const branches = await sequelize.query(
    `SELECT branch_id FROM branches WHERE is_active IS DISTINCT FROM false ORDER BY branch_id`,
    { type: sequelize.QueryTypes.SELECT }
  );

  const [sourceCountRow] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM menu_items WHERE branch_id = :source AND is_available = true`,
    {
      replacements: { source: SOURCE_BRANCH_ID },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  const sourceCount = sourceCountRow?.cnt ?? 0;
  if (sourceCount === 0) return { cloned: [] };

  const cloned = [];

  for (const row of branches) {
    const branchId = Number(row.branch_id);
    if (!Number.isFinite(branchId) || branchId === SOURCE_BRANCH_ID) continue;

    const [existing] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM menu_items WHERE branch_id = :branchId`,
      {
        replacements: { branchId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if ((existing?.cnt ?? 0) > 0) continue;

    await sequelize.query(
      `INSERT INTO menu_items (branch_id, name, description, price, sale_price, category, is_available, is_featured, created_at, image_url)
       SELECT :branchId, name, description, price, sale_price, category, is_available, is_featured, NOW(), image_url
       FROM menu_items
       WHERE branch_id = :source AND is_available = true`,
      {
        replacements: { branchId, source: SOURCE_BRANCH_ID },
      }
    );
    cloned.push(branchId);
  }

  if (cloned.length > 0) {
    console.log(`✅ Đã sao chép thực đơn (branch ${SOURCE_BRANCH_ID}) → chi nhánh: ${cloned.join(", ")}`);
  }

  return { cloned };
}

module.exports = { ensureMenuForEmptyBranches, SOURCE_BRANCH_ID };
