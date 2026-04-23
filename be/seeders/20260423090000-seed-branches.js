'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkDelete('branches', {
      branch_id: { [Sequelize.Op.in]: [1, 2] },
    });

    await queryInterface.bulkInsert(
      'branches',
      [
        {
          branch_id: 1,
          name: 'Chi nhánh Hà Nội',
          address: '123 Trần Duy Hưng, Cầu Giấy, Hà Nội',
          phone: '02438555555',
          open_time: '09:00',
          close_time: '22:00',
          image_url: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          branch_id: 2,
          name: 'Chi nhánh TP.HCM',
          address: '456 Nguyễn Trãi, Quận 5, TP.HCM',
          phone: '02838555555',
          open_time: '09:00',
          close_time: '22:00',
          image_url: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('branches', {
      branch_id: { [Sequelize.Op.in]: [1, 2] },
    });
  },
};
