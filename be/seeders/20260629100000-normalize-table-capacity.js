'use strict';

/**
 * SEED NORMALIZE TABLE CAPACITY — chuẩn hóa sức chứa mọi bàn = 6 chỗ.
 * Ctrl+F: normalize table capacity, capacity = 6, TABLE_CAPACITY
 * Quy tắc cố định demo để thuật toán ghép bàn dễ giải thích.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('UPDATE tables SET capacity = 6');
  },

  async down() {
    // Không khôi phục capacity cũ
  },
};
