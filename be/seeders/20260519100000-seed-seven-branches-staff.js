'use strict';

const bcrypt = require('bcrypt');

/** Mỗi chi nhánh: 1 quản lý, 2 phục vụ, 1 bếp */
const STAFF_ROLES = [
  { key: 'mgr', role: 'manager', position: 'manager', salary: 16500000, name: 'Quản lý' },
  { key: 'w1', role: 'waiter', position: 'waiter', salary: 8800000, name: 'Phục vụ 1' },
  { key: 'w2', role: 'waiter', position: 'waiter', salary: 8500000, name: 'Phục vụ 2' },
  { key: 'kit', role: 'kitchen', position: 'kitchen', salary: 11800000, name: 'Bếp trưởng' },
];

const BRANCH_LABELS = {
  1: 'HN Cầu Giấy',
  2: 'HN Ba Đình',
  3: 'HN Hai Bà Trưng',
  4: 'Đà Nẵng',
  5: 'HCM Q1',
  6: 'HCM Q5',
  7: 'HCM Thủ Đức',
};

function buildStaffUsers() {
  const users = [];
  for (let branchId = 1; branchId <= 7; branchId += 1) {
    const label = BRANCH_LABELS[branchId];
    STAFF_ROLES.forEach((r, idx) => {
      const phoneSuffix = String(branchId * 10 + idx).padStart(2, '0');
      users.push({
        username: `hl_b${branchId}_${r.key}`,
        full_name: `${r.name} ${label}`,
        phone: `09${branchId}${idx}0000${branchId}`.slice(0, 10),
        role: r.role,
        branch_id: branchId,
        position: r.position,
        salary: r.salary,
      });
    });
  }
  return users;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const hashedPassword = await bcrypt.hash('123456', 10);
    const staffDefs = buildStaffUsers();
    const usernames = staffDefs.map((u) => u.username);

    await queryInterface.sequelize.query(
      `DELETE FROM employees WHERE user_id IN (
        SELECT user_id FROM users WHERE username IN (${usernames.map((u) => `'${u}'`).join(',')})
      )`
    );
    await queryInterface.bulkDelete('users', {
      username: { [Sequelize.Op.in]: usernames },
    });

    await queryInterface.bulkInsert(
      'users',
      staffDefs.map((u) => ({
        username: u.username,
        password_hash: hashedPassword,
        full_name: u.full_name,
        phone: u.phone,
        role: u.role,
        branch_id: u.branch_id,
      })),
      {}
    );

    const inserted = await queryInterface.sequelize.query(
      `SELECT user_id, username FROM users WHERE username IN (${usernames.map((u) => `'${u}'`).join(',')})`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const userMap = Object.fromEntries(inserted.map((u) => [u.username, u.user_id]));

    const employees = staffDefs.map((u, i) => ({
      user_id: userMap[u.username],
      branch_id: u.branch_id,
      position: u.position,
      salary: u.salary,
      hire_date: new Date(2024, (i % 12), 1 + (i % 20)),
      status: i % 11 === 0 ? 'on_leave' : 'active',
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('employees', employees, {});

    const tables = [];
    for (let branchId = 1; branchId <= 7; branchId += 1) {
      const tableCount = branchId === 4 ? 25 : 30;
      for (let n = 1; n <= tableCount; n += 1) {
        tables.push({
          branch_id: branchId,
          table_number: n,
          capacity: 6,
          status: 'available',
          created_at: now,
        });
      }
    }
    await queryInterface.bulkInsert('tables', tables, {});

    await queryInterface.sequelize.query(
      `UPDATE users SET branch_id = 1 WHERE username IN ('admin_b1','manager1','kitchen1','waiter1','ngochuy','danny','adrian')`
    );
    await queryInterface.sequelize.query(
      `UPDATE users SET branch_id = 5 WHERE username IN ('admin_b2','kimberly','sydney','debbie','manager2')`
    );
    await queryInterface.sequelize.query(
      `UPDATE users SET branch_id = 6 WHERE username IN ('waiter2','waiter3','waiter4','kitchen2','kitchen3','kitchen4')`
    );
    await queryInterface.sequelize.query(
      `UPDATE users SET branch_id = 1 WHERE username LIKE 'b1user%'`
    );
    await queryInterface.sequelize.query(
      `UPDATE users SET branch_id = 6 WHERE username LIKE 'b2user%'`
    );
  },

  async down(queryInterface, Sequelize) {
    const usernames = buildStaffUsers().map((u) => `'${u.username}'`).join(',');
    await queryInterface.sequelize.query(
      `DELETE FROM employees WHERE user_id IN (SELECT user_id FROM users WHERE username IN (${usernames}))`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM tables WHERE branch_id BETWEEN 1 AND 7`
    );
    await queryInterface.bulkDelete('users', {
      username: {
        [Sequelize.Op.in]: buildStaffUsers().map((u) => u.username),
      },
    });
  },
};
