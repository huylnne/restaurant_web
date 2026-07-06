'use strict';

/**
 * SCRIPT CLEANUP DEMO ORDERS — dọn các order/bàn đang treo trước khi quay demo.
 * Ctrl+F: cleanup demo orders, cleanup-active-demo-orders, no active session
 * Chạy: npm run cleanup:demo-orders -- --yes
 */
require('dotenv').config();

const db = require('../models');
require('../models/index');

const ACTIVE_STATUSES = [
  'pending',
  'confirmed',
  'pre-ordered',
  'in_progress',
  'waiting_payment',
  'open',
  'PENDING',
  'preorder',
  'IN_PROGRESS',
];

const shouldDelete = process.argv.includes('--yes');

async function main() {
  const sequelize = db.sequelize;
  const transaction = await sequelize.transaction();

  try {
    const [summary] = await sequelize.query(
      `
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE table_id IS NOT NULL
        AND status IN (:activeStatuses)
        AND note = 'bulk_seed';
      `,
      {
        replacements: { activeStatuses: ACTIVE_STATUSES },
        transaction,
      }
    );

    const count = summary[0]?.count || 0;
    console.log(`Active bulk_seed table orders: ${count}`);

    if (!shouldDelete) {
      await transaction.rollback();
      console.log('Dry run only. Re-run with --yes to delete them.');
      return;
    }

    const [affectedTables] = await sequelize.query(
      `
      SELECT DISTINCT table_id
      FROM orders
      WHERE table_id IS NOT NULL
        AND status IN (:activeStatuses)
        AND note = 'bulk_seed';
      `,
      {
        replacements: { activeStatuses: ACTIVE_STATUSES },
        transaction,
      }
    );
    const tableIds = affectedTables.map((row) => row.table_id).filter(Boolean);

    await sequelize.query(
      `
      DELETE FROM reviews
      WHERE order_id IN (
        SELECT order_id FROM orders
        WHERE table_id IS NOT NULL
          AND status IN (:activeStatuses)
          AND note = 'bulk_seed'
      );
      `,
      {
        replacements: { activeStatuses: ACTIVE_STATUSES },
        transaction,
      }
    );

    await sequelize.query(
      `
      DELETE FROM payments
      WHERE order_id IN (
        SELECT order_id FROM orders
        WHERE table_id IS NOT NULL
          AND status IN (:activeStatuses)
          AND note = 'bulk_seed'
      );
      `,
      {
        replacements: { activeStatuses: ACTIVE_STATUSES },
        transaction,
      }
    );

    await sequelize.query(
      `
      DELETE FROM order_items
      WHERE order_id IN (
        SELECT order_id FROM orders
        WHERE table_id IS NOT NULL
          AND status IN (:activeStatuses)
          AND note = 'bulk_seed'
      );
      `,
      {
        replacements: { activeStatuses: ACTIVE_STATUSES },
        transaction,
      }
    );

    await sequelize.query(
      `
      DELETE FROM orders
      WHERE table_id IS NOT NULL
        AND status IN (:activeStatuses)
        AND note = 'bulk_seed';
      `,
      {
        replacements: { activeStatuses: ACTIVE_STATUSES },
        transaction,
      }
    );

    if (tableIds.length) {
      await sequelize.query(
        `
        UPDATE tables
        SET status = 'available'
        WHERE table_id IN (:tableIds)
          AND NOT EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.table_id = tables.table_id
              AND o.status IN (:activeStatuses)
          );
        `,
        {
          replacements: { tableIds, activeStatuses: ACTIVE_STATUSES },
          transaction,
        }
      );
    }

    await transaction.commit();
    console.log(`Deleted ${count} active bulk_seed table orders.`);
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
