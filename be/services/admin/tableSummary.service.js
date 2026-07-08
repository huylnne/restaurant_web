/**
 * SERVICE TABLE SUMMARY — thống kê và tự đồng bộ trạng thái bàn theo lịch đặt.
 * Ctrl+F: table summary service, expireReservationsForBranch, getTableSummary, no_show
 * UC10: trống, đã đặt, đang phục vụ, chờ dọn.
 * Dashboard và trang Quản lý bàn đều gọi service này để đảm bảo số liệu khớp.
 */
const { Table } = require("../../models");
const { TABLE_STATUS } = require("../../utils/tableStatus");
const db = require("../../models/db");
const { Sequelize } = require("sequelize");

const DEFAULT_BRANCH_ID = 1;

/** [NO-SHOW] Số phút sau giờ đặt mà khách chưa tới thì coi là no-show → giải phóng bàn và khóa tài khoản. Ctrl+F: OVERDUE_MINUTES */
const OVERDUE_MINUTES = 15;
/** [PRE-ORDERED] Số phút trước giờ đặt thì chuyển bàn sang pre-ordered để nhân viên chuẩn bị. Ctrl+F: PRE_ORDER_MINUTES */
const PRE_ORDER_MINUTES = 15;

/**
 * Đồng bộ trạng thái bàn dựa theo orders (phiên đặt bàn):
 *  1. Đặt bàn chưa được tiếp nhận quá 15 phút → no_show, giải phóng bàn, khóa tài khoản khách
 *  2. Chuyển bàn sang 'pre-ordered' khi còn ≤ PRE_ORDER_MINUTES trước giờ đến
 * Ctrl+F: expireReservationsForBranch, tự động no_show, khóa tài khoản
 */
async function expireReservationsForBranch(branchId, cutoff) {
  const now = new Date();
  const nowIso = now.toISOString();
  // Mốc no-show: giờ đến <= (hiện tại - 15 phút) mà chưa check-in thì tính là bỏ hẹn.
  const noShowDeadline = cutoff || new Date(now.getTime() - OVERDUE_MINUTES * 60 * 1000);
  // Mốc pre-order: giờ đến <= (hiện tại + 15 phút) thì chuẩn bị giữ bàn.
  const preOrderTrigger = new Date(now.getTime() + PRE_ORDER_MINUTES * 60 * 1000);

  // BƯỚC 1: tự động NO-SHOW + KHÓA TÀI KHOẢN khách.
  // CTE "expired": update các order quá hạn chưa check-in sang 'no_show', trả về user_id của chúng.
  // Sau đó khóa (locked=true) các user role 'user' tương ứng chưa bị khóa → phạt khách bỏ hẹn.
  await db.sequelize.query(
    `WITH expired AS (
       UPDATE orders
       SET status = 'no_show'
       WHERE order_type = 'reservation'
         AND branch_id = :branchId
         AND status IN ('pending', 'confirmed', 'pre-ordered')
         AND checked_in_at IS NULL
         AND arrival_time <= :noShowDeadline
       RETURNING user_id
     )
     UPDATE users u
     SET locked = true
     WHERE u.user_id IN (
       SELECT user_id
       FROM expired
       WHERE user_id IS NOT NULL
     )
       AND u.role = 'user'
       AND u.locked = false`,
    {
      replacements: {
        branchId,
        noShowDeadline: noShowDeadline.toISOString(),
      },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );

  // Danh sách bàn "sắp có khách đặt tới" (trong 15 phút tới): gồm bàn chính (orders.table_id)
  // và bàn ghép (order_tables). UNION để gộp cả 2 nguồn, khử trùng.
  const reservedTableSubquery = `
    SELECT o.table_id AS table_id
    FROM orders o
    JOIN tables tb ON tb.table_id = o.table_id
    WHERE o.order_type = 'reservation'
      AND o.status IN ('pending', 'confirmed', 'pre-ordered')
      AND o.arrival_time > :now
      AND o.arrival_time <= :preOrderTrigger
      AND tb.branch_id = :branchId
    UNION
    SELECT ot.table_id AS table_id
    FROM order_tables ot
    JOIN orders o ON o.order_id = ot.order_id
    JOIN tables tb ON tb.table_id = ot.table_id
    WHERE o.order_type = 'reservation'
      AND o.status IN ('pending', 'confirmed', 'pre-ordered')
      AND o.arrival_time > :now
      AND o.arrival_time <= :preOrderTrigger
      AND tb.branch_id = :branchId
  `;

  // BƯỚC 2: nhả bàn 'pre-ordered' về 'available' nếu KHÔNG còn nằm trong danh sách sắp có khách
  // (vd đặt bàn đã bị hủy/no-show) → tránh giữ bàn thừa.
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

  // BƯỚC 3: chuyển bàn 'available' sang 'pre-ordered' nếu sắp có khách đặt tới (trong 15 phút)
  // → nhân viên biết mà giữ/chuẩn bị bàn.
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

/** [SƠ ĐỒ BÀN] Tổng hợp số bàn available/serving/reserved/cleaning cho chi nhánh. Ctrl+F: getTableSummary */
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
                 AND o.status IN ('pending', 'confirmed', 'pre-ordered', 'waiting_payment')
                 AND o.arrival_time > :now
             )
             OR EXISTS (
               SELECT 1 FROM order_tables ot
               JOIN orders o ON o.order_id = ot.order_id
               WHERE ot.table_id = t.table_id
                 AND o.order_type = 'reservation'
                 AND o.status IN ('pending', 'confirmed', 'pre-ordered', 'waiting_payment')
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
           AND o.status IN ('pending', 'confirmed', 'pre-ordered', 'waiting_payment')
           AND o.arrival_time > :now
       )
       AND NOT EXISTS (
         SELECT 1 FROM order_tables ot
         JOIN orders o ON o.order_id = ot.order_id
         WHERE ot.table_id = t.table_id
           AND o.order_type = 'reservation'
           AND o.status IN ('pending', 'confirmed', 'pre-ordered', 'waiting_payment')
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
