/**
 * Service dùng chung cho thống kê bàn (tổng số, trống, đang phục vụ, đã đặt).
 * Dashboard và trang Quản lý bàn đều gọi service này để đảm bảo số liệu khớp.
 *
 * Rule: chỉ đếm bàn active, theo branch_id. (Sau này thêm is_deleted, is_active thì bổ sung vào baseWhere.)
 */
const { Table } = require("../../models");
const db = require("../../models/db");
const { Sequelize } = require("sequelize");

const DEFAULT_BRANCH_ID = 1;

/**
 * Cập nhật status bàn có reservation đã qua thành 'available' (chạy trước khi đếm để số liệu nhất quán).
 * @param {number} branchId
 * @param {Date} now
 */
async function expireReservationsForBranch(branchId, now) {
  const expiredReservationsQuery = `
    UPDATE tables t
    SET status = 'available'
    WHERE t.branch_id = :branchId
      AND t.status = 'pre-ordered'
      AND t.table_id IN (
        SELECT r.table_id
        FROM reservations r
        WHERE r.status = 'confirmed'
          AND r.reservation_time <= :now
      )
  `;
  await db.sequelize.query(expiredReservationsQuery, {
    replacements: { branchId, now: now.toISOString() },
    type: Sequelize.QueryTypes.UPDATE,
  });
}

/**
 * Lấy thống kê bàn theo branch – một nguồn duy nhất cho Dashboard và Trang quản lý bàn.
 * @param {number} [branchId=1] - branch hiện tại (mặc định 1)
 * @returns {Promise<{ totalTables: number, availableTables: number, servingTables: number, reservedTables: number }>}
 */
async function getTableSummary(branchId = DEFAULT_BRANCH_ID) {
  const now = new Date();
  await expireReservationsForBranch(branchId, now);

  const baseWhere = { branch_id: branchId };
  // Sau này nếu có soft delete / active: baseWhere.is_deleted = false; baseWhere.is_active = true;

  const [totalTables, availableTables, servingTables, reservedTables] = await Promise.all([
    Table.count({ where: baseWhere }),
    Table.count({ where: { ...baseWhere, status: "available" } }),
    Table.count({ where: { ...baseWhere, status: "occupied" } }),
    Table.count({ where: { ...baseWhere, status: "pre-ordered" } }),
  ]);

  return {
    totalTables,
    availableTables,
    servingTables,
    reservedTables,
  };
}

module.exports = {
  getTableSummary,
  expireReservationsForBranch,
  DEFAULT_BRANCH_ID,
};
