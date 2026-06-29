'use strict';

/** Chuẩn hóa sức chứa mọi bàn = 6 chỗ (quy tắc cố định demo). */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('UPDATE tables SET capacity = 6');
  },

  async down() {
    // Không khôi phục capacity cũ
  },
};
