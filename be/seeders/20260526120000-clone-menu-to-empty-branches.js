'use strict';

/**
 * SEED CLONE MENU TO EMPTY BRANCHES — clone menu branch 1 sang chi nhánh chưa có món.
 * Ctrl+F: seed clone menu, ensureMenuForEmptyBranches, clone menu
 */
const { ensureMenuForEmptyBranches } = require('../utils/ensureBranchMenus');

/** Chạy: npx sequelize-cli db:seed --seed 20260526120000-clone-menu-to-empty-branches.js */
module.exports = {
  async up(queryInterface) {
    await ensureMenuForEmptyBranches(queryInterface.sequelize);
  },

  async down() {
    // Không xóa menu đã clone — tránh mất dữ liệu admin chỉnh sửa
  },
};
