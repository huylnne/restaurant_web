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

/** Số phút sau giờ đặt mà khách chưa tới thì coi là no-show → giải phóng bàn */
const OVERDUE_MINUTES = 15;
/** Số phút trước giờ đặt thì chuyển bàn sang 'pre-ordered' để nhân viên chuẩn bị */
const PRE_ORDER_MINUTES = 15;

/**
 * Đồng bộ trạng thái bàn dựa theo reservation:
 *  1. Đánh dấu reservation no-show (quá OVERDUE_MINUTES) → 'completed', giải phóng bàn
 *  2. Chuyển bàn sang 'pre-ordered' khi còn ≤ PRE_ORDER_MINUTES trước giờ đặt
 *
 * @param {number} branchId
 * @param {Date} [cutoff] - Thời điểm cắt no-show. Mặc định = now - OVERDUE_MINUTES.
 */
async function expireReservationsForBranch(branchId, cutoff) {
  const now = new Date();
  const nowIso = now.toISOString();
  const noShowDeadline  = cutoff || new Date(now.getTime() - OVERDUE_MINUTES * 60 * 1000);
  const preOrderTrigger = new Date(now.getTime() + PRE_ORDER_MINUTES * 60 * 1000);

  // 1. Đánh dấu reservation no-show là 'completed'
  await db.sequelize.query(
    `UPDATE reservations
     SET status = 'completed'
     WHERE status = 'confirmed'
       AND reservation_time <= :noShowDeadline
       AND table_id IN (
         SELECT table_id FROM tables
         WHERE branch_id = :branchId AND status = 'pre-ordered'
       )`,
    {
      replacements: { branchId, noShowDeadline: noShowDeadline.toISOString() },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );

  // 2. Giải phóng bàn không còn reservation active
  await db.sequelize.query(
    `UPDATE tables t
     SET status = 'available'
     WHERE t.branch_id = :branchId
       AND t.status = 'pre-ordered'
       AND t.table_id NOT IN (
         SELECT table_id FROM reservations
         WHERE status IN ('confirmed', 'pre-ordered')
           AND reservation_time > :now
           AND reservation_time <= :preOrderTrigger
       )`,
    {
      replacements: {
        branchId,
        now: nowIso,
        preOrderTrigger: preOrderTrigger.toISOString(),
      },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );

  // 3. Chuyển bàn sang 'pre-ordered' khi còn ≤ PRE_ORDER_MINUTES trước giờ đặt
  await db.sequelize.query(
    `UPDATE tables t
     SET status = 'pre-ordered'
     WHERE t.branch_id = :branchId
       AND t.status = 'available'
       AND t.table_id IN (
         SELECT table_id FROM reservations
         WHERE status = 'confirmed'
           AND reservation_time <= :preOrderTrigger
           AND reservation_time > :now
       )`,
    {
      replacements: {
        branchId,
        now: nowIso,
        preOrderTrigger: preOrderTrigger.toISOString(),
      },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );
}

/**
 * Lấy thống kê bàn theo branch – một nguồn duy nhất cho Dashboard và Trang quản lý bàn.
 * @param {number} [branchId=1] - branch hiện tại (mặc định 1)
 * @returns {Promise<{ totalTables: number, availableTables: number, servingTables: number, reservedTables: number }>}
 */
async function getTableSummary(branchId = DEFAULT_BRANCH_ID) {
  await expireReservationsForBranch(branchId);

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
