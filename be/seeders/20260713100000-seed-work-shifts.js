'use strict';

/**
 * SEED WORK SHIFTS — lịch ca làm việc demo cho nhân viên các chi nhánh.
 * Ctrl+F: seed work shifts, work_shifts, ca làm việc
 * Chạy: npx sequelize-cli db:seed --seed 20260713100000-seed-work-shifts.js --env development
 */
const SEED_NOTE = 'seed_work_shift';

/** Ca mẫu theo chức vụ — start/end dạng HH:MM. */
const SHIFT_TEMPLATES = {
  manager: [{ start_time: '08:00', end_time: '17:00' }],
  waiter: [
    { start_time: '08:00', end_time: '14:00' },
    { start_time: '14:00', end_time: '22:00' },
  ],
  cashier: [{ start_time: '10:00', end_time: '18:00' }],
  chef: [
    { start_time: '07:00', end_time: '15:00' },
    { start_time: '15:00', end_time: '23:00' },
  ],
  kitchen: [
    { start_time: '07:00', end_time: '15:00' },
    { start_time: '15:00', end_time: '23:00' },
  ],
  admin: [{ start_time: '08:00', end_time: '17:00' }],
};

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base, offset) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function pickShiftTemplate(position, employeeId) {
  const key = SHIFT_TEMPLATES[position] ? position : 'waiter';
  const templates = SHIFT_TEMPLATES[key];
  return templates[employeeId % templates.length];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.sequelize.query(
      `DELETE FROM work_shifts WHERE note = :note`,
      { replacements: { note: SEED_NOTE } }
    );

    const employees = await queryInterface.sequelize.query(
      `SELECT employee_id, branch_id, position, status
       FROM employees
       WHERE status IN ('active', 'on_leave')
       ORDER BY branch_id, employee_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!employees.length) {
      console.log('⚠️ seed-work-shifts: không có nhân viên, bỏ qua');
      return;
    }

    const rows = [];
    const DAY_START = -7;
    const DAY_END = 14;

    for (let offset = DAY_START; offset <= DAY_END; offset += 1) {
      const shiftDate = formatDateOnly(addDays(now, offset));

      for (const emp of employees) {
        if (emp.status === 'on_leave' && offset % 3 !== 0) continue;

        const template = pickShiftTemplate(emp.position, emp.employee_id);
        rows.push({
          employee_id: emp.employee_id,
          branch_id: emp.branch_id,
          shift_date: shiftDate,
          start_time: template.start_time,
          end_time: template.end_time,
          note: SEED_NOTE,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await queryInterface.bulkInsert('work_shifts', rows.slice(i, i + chunkSize), {});
    }

    console.log(`✅ Seed ${rows.length} ca làm việc (${employees.length} nhân viên, ${DAY_END - DAY_START + 1} ngày)`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM work_shifts WHERE note = '${SEED_NOTE}'`
    );
  },
};
