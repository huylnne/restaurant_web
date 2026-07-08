/**
 * UTIL ENSURE BRANCH MENUS — sao chép thực đơn mẫu (branch 1) sang chi nhánh chưa có món.
 * Ctrl+F: ensureBranchMenus, ensureMenuForEmptyBranches, sao chép thực đơn
 * Mỗi chi nhánh có bản menu riêng (branch_id) — không dùng chung 1 catalog toàn hệ thống.
 */
const SOURCE_BRANCH_ID = 1;

/** [SEED/MIGRATION] Clone menu branch 1 cho các chi nhánh active chưa có menu_items. Ctrl+F: ensureMenuForEmptyBranches */
async function ensureMenuForEmptyBranches(sequelize) {
  // Lấy tất cả chi nhánh đang hoạt động (is_active khác false → gồm cả true và NULL).
  const branches = await sequelize.query(
    `SELECT branch_id FROM branches WHERE is_active IS DISTINCT FROM false ORDER BY branch_id`,
    { type: sequelize.QueryTypes.SELECT }
  );

  // Đếm số món khả dụng ở chi nhánh nguồn (branch 1) — dùng làm menu mẫu.
  const [sourceCountRow] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM menu_items WHERE branch_id = :source AND is_available = true`,
    {
      replacements: { source: SOURCE_BRANCH_ID },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  const sourceCount = sourceCountRow?.cnt ?? 0;
  // Nếu chi nhánh nguồn chưa có món thì không có gì để clone → thoát sớm.
  if (sourceCount === 0) return { cloned: [] };

  const cloned = []; // ghi lại các chi nhánh đã được clone menu

  for (const row of branches) {
    const branchId = Number(row.branch_id);
    // Bỏ qua id lỗi và bỏ qua chính chi nhánh nguồn.
    if (!Number.isFinite(branchId) || branchId === SOURCE_BRANCH_ID) continue;

    // Chi nhánh đã có sẵn món rồi thì KHÔNG clone đè (tránh trùng menu).
    const [existing] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM menu_items WHERE branch_id = :branchId`,
      {
        replacements: { branchId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if ((existing?.cnt ?? 0) > 0) continue;

    // Copy toàn bộ món khả dụng từ chi nhánh nguồn sang chi nhánh này (gán branch_id mới, created_at = NOW()).
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
