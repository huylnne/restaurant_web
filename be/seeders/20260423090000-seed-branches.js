'use strict';

const BRANCHES = [
  {
    branch_id: 1,
    name: 'ABC Restaurant Hà Nội - Cầu Giấy',
    address: '123 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    phone: '0243811110',
    open_time: '08:00',
    close_time: '22:00',
    latitude: 21.0134,
    longitude: 105.7985,
  },
  {
    branch_id: 2,
    name: 'ABC Restaurant Hà Nội - Ba Đình',
    address: '45 Phan Đình Phùng, Ba Đình, Hà Nội',
    phone: '0243811102',
    open_time: '08:00',
    close_time: '22:00',
    latitude: 21.035,
    longitude: 105.834,
  },
  {
    branch_id: 3,
    name: 'ABC Restaurant Hà Nội - Hai Bà Trưng',
    address: '88 Bạch Mai, Hai Bà Trưng, Hà Nội',
    phone: '0243811103',
    open_time: '08:00',
    close_time: '22:00',
    latitude: 21.006323,
    longitude: 105.843099,
  },
  {
    branch_id: 4,
    name: 'ABC Restaurant Đà Nẵng',
    address: '123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
    phone: '0236381104',
    open_time: '08:00',
    close_time: '22:00',
    latitude: 16.0544,
    longitude: 108.2022,
  },
  {
    branch_id: 5,
    name: 'ABC Restaurant TP.HCM - Quận 1',
    address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    phone: '0283811105',
    open_time: '08:00',
    close_time: '22:00',
    latitude: 10.7769,
    longitude: 106.7009,
  },
  {
    branch_id: 6,
    name: 'ABC Restaurant TP.HCM - Quận 5',
    address: '456 Nguyễn Trãi, Quận 5, TP.HCM',
    phone: '0283811106',
    open_time: '08:00',
    close_time: '22:00',
    latitude: 10.7542,
    longitude: 106.669,
  },
  {
    branch_id: 7,
    name: 'ABC Restaurant TP.HCM - Thủ Đức',
    address: '12 Võ Văn Ngân, Thủ Đức, TP.HCM',
    phone: '0283811107',
    open_time: '08:00',
    close_time: '22:00',
    latitude: 10.8505,
    longitude: 106.7717,
  },
];

function branchRows(now) {
  return BRANCHES.map((b) => ({
    ...b,
    image_url: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  }));
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const ids = BRANCHES.map((b) => b.branch_id);

    await queryInterface.sequelize.query(
      `UPDATE users SET branch_id = NULL WHERE branch_id IN (${ids.join(',')})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM employees WHERE branch_id IN (${ids.join(',')})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM tables WHERE branch_id IN (${ids.join(',')})`
    );

    await queryInterface.bulkDelete('branches', {
      branch_id: { [Sequelize.Op.in]: ids },
    });

    await queryInterface.bulkInsert('branches', branchRows(now), {});

    await queryInterface.sequelize.query(
      `SELECT setval(
        pg_get_serial_sequence('branches', 'branch_id'),
        (SELECT COALESCE(MAX(branch_id), 1) FROM branches)
      )`
    );
  },

  async down(queryInterface, Sequelize) {
    const ids = BRANCHES.map((b) => b.branch_id);
    await queryInterface.sequelize.query(
      `DELETE FROM employees WHERE branch_id IN (${ids.join(',')})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM tables WHERE branch_id IN (${ids.join(',')})`
    );
    await queryInterface.bulkDelete('branches', {
      branch_id: { [Sequelize.Op.in]: ids },
    });
  },
};
