/**
 * Service dùng chung cho thống kê bàn (UC10: trống, đã đặt, đang phục vụ, chờ dọn).
 * Dashboard và trang Quản lý bàn đều gọi service này để đảm bảo số liệu khớp.
 */
const { Table } = require("../../models");
const { TABLE_STATUS } = require("../../utils/tableStatus");
const db = require("../../models/db");
const { Sequelize } = require("sequelize");

const DEFAULT_BRANCH_ID = 1;

/** Số phút sau giờ đặt mà khách chưa tới thì coi là no-show → giải phóng bàn */
const OVERDUE_MINUTES = 15;
/** Số phút trước giờ đặt thì chuyển bàn sang 'pre-ordered' để nhân viên chuẩn bị */
const PRE_ORDER_MINUTES = 15;

/**
 * Đồng bộ trạng thái bàn dựa theo orders (phiên đặt bàn):
 *  1. No-show reservation orders → completed, giải phóng bàn
 *  2. Chuyển bàn sang 'pre-ordered' khi còn ≤ PRE_ORDER_MINUTES trước giờ đến
 */
async function expireReservationsForBranch(branchId, cutoff) {
  const now = new Date();
  const nowIso = now.toISOString();
  const noShowDeadline = cutoff || new Date(now.getTime() - OVERDUE_MINUTES * 60 * 1000);
  const preOrderTrigger = new Date(now.getTime() + PRE_ORDER_MINUTES * 60 * 1000);

  await db.sequelize.query(
    `UPDATE orders
     SET status = 'completed'
     WHERE order_type = 'reservation'
       AND status = 'confirmed'
       AND arrival_time <= :noShowDeadline
       AND table_id IN (
         SELECT table_id FROM tables
         WHERE branch_id = :branchId AND status = :preOrdered
       )`,
    {
      replacements: {
        branchId,
        preOrdered: TABLE_STATUS.PRE_ORDERED,
        noShowDeadline: noShowDeadline.toISOString(),
      },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );

  const reservedTableSubquery = `
    SELECT o.table_id AS table_id
    FROM orders o
    JOIN tables tb ON tb.table_id = o.table_id
    WHERE o.order_type = 'reservation'
      AND o.status IN ('confirmed', 'pre-ordered')
      AND o.arrival_time > :now
      AND o.arrival_time <= :preOrderTrigger
      AND tb.branch_id = :branchId
    UNION
    SELECT ot.table_id AS table_id
    FROM order_tables ot
    JOIN orders o ON o.order_id = ot.order_id
    JOIN tables tb ON tb.table_id = ot.table_id
    WHERE o.order_type = 'reservation'
      AND o.status IN ('confirmed', 'pre-ordered')
      AND o.arrival_time > :now
      AND o.arrival_time <= :preOrderTrigger
      AND tb.branch_id = :branchId
  `;

  await db.sequelize.query(
    `UPDATE tables t
     SET status = :available
     WHERE t.branch_id = :branchId
       AND t.status = :preOrdered
       AND t.table_id NOT IN (${reservedTableSubquery})`,
    {
      replacements: {
        branchId,
        available: TABLE_STATUS.AVAILABLE,
        preOrdered: TABLE_STATUS.PRE_ORDERED,
        now: nowIso,
        preOrderTrigger: preOrderTrigger.toISOString(),
      },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );

  await db.sequelize.query(
    `UPDATE tables t
     SET status = :preOrdered
     WHERE t.branch_id = :branchId
       AND t.status = :available
       AND t.table_id IN (${reservedTableSubquery})`,
    {
      replacements: {
        branchId,
        available: TABLE_STATUS.AVAILABLE,
        preOrdered: TABLE_STATUS.PRE_ORDERED,
        now: nowIso,
        preOrderTrigger: preOrderTrigger.toISOString(),
      },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );
}

async function getTableSummary(branchId = DEFAULT_BRANCH_ID) {
  await expireReservationsForBranch(branchId);

  const baseWhere = { branch_id: branchId };
  const nowIso = new Date().toISOString();

  const [totalTables, servingTables, cleaningTables] = await Promise.all([
    Table.count({ where: baseWhere }),
    Table.count({ where: { ...baseWhere, status: TABLE_STATUS.OCCUPIED } }),
    Table.count({ where: { ...baseWhere, status: TABLE_STATUS.CLEANING } }),
  ]);

  const [reservedRow] = await db.sequelize.query(
    `SELECT COUNT(*)::int AS c FROM tables t
     WHERE t.branch_id = :branchId
       AND (
         t.status = 'pre-ordered'
         OR (
           t.status = 'available'
           AND (
             EXISTS (
               SELECT 1 FROM orders o
               WHERE o.table_id = t.table_id
                 AND o.order_type = 'reservation'
                 AND o.status IN ('confirmed', 'pre-ordered', 'waiting_payment')
                 AND o.arrival_time > :now
             )
             OR EXISTS (
               SELECT 1 FROM order_tables ot
               JOIN orders o ON o.order_id = ot.order_id
               WHERE ot.table_id = t.table_id
                 AND o.order_type = 'reservation'
                 AND o.status IN ('confirmed', 'pre-ordered', 'waiting_payment')
                 AND o.arrival_time > :now
             )
           )
         )
       )`,
    { replacements: { branchId, now: nowIso }, type: Sequelize.QueryTypes.SELECT }
  );

  const [availableRow] = await db.sequelize.query(
    `SELECT COUNT(*)::int AS c FROM tables t
     WHERE t.branch_id = :branchId
       AND t.status = 'available'
       AND NOT EXISTS (
         SELECT 1 FROM orders o
         WHERE o.table_id = t.table_id
           AND o.order_type = 'reservation'
           AND o.status IN ('confirmed', 'pre-ordered', 'waiting_payment')
           AND o.arrival_time > :now
       )
       AND NOT EXISTS (
         SELECT 1 FROM order_tables ot
         JOIN orders o ON o.order_id = ot.order_id
         WHERE ot.table_id = t.table_id
           AND o.order_type = 'reservation'
           AND o.status IN ('confirmed', 'pre-ordered', 'waiting_payment')
           AND o.arrival_time > :now
       )`,
    { replacements: { branchId, now: nowIso }, type: Sequelize.QueryTypes.SELECT }
  );

  const reservedTables = Number(reservedRow?.c ?? 0);
  const availableTables = Number(availableRow?.c ?? 0);

  return {
    totalTables,
    availableTables,
    servingTables,
    reservedTables,
    cleaningTables,
  };
}

module.exports = {
  getTableSummary,
  expireReservationsForBranch,
  DEFAULT_BRANCH_ID,
};
