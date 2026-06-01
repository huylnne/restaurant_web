const { RESERVATION_STATUS } = require("./reservationStatus");

/** Trước giờ đặt bàn bao nhiêu phút thì coi là "sắp phục vụ" (nhắc bếp). */
const SOON_SERVE_MINUTES = 15;
/** Cho phép làm món trễ giờ đặt một chút (khách trễ). */
const OVERDUE_GRACE_MINUTES = 30;

const AT_TABLE_STATUSES = new Set([
  RESERVATION_STATUS.PRE_ORDERED,
  RESERVATION_STATUS.WAITING_PAYMENT,
]);

/**
 * Ngữ cảnh phục vụ cho bếp: đặt trước theo giờ bàn vs đang phục vụ tại bàn.
 */
function resolveKitchenServeContext(order, reservation) {
  const now = Date.now();
  const resStatus = String(reservation?.status || "").toLowerCase();
  const resTimeMs = reservation?.reservation_time
    ? new Date(reservation.reservation_time).getTime()
    : null;
  const orderAtMs = order?.created_at ? new Date(order.created_at).getTime() : now;

  if (AT_TABLE_STATUSES.has(resStatus)) {
    return {
      serve_mode: "active",
      serve_label: "Đang phục vụ",
      serve_at: orderAtMs,
      serve_at_iso: new Date(orderAtMs).toISOString(),
      sort_key: orderAtMs,
      is_urgent: true,
    };
  }

  if (reservation && resTimeMs) {
    const minutesUntil = Math.round((resTimeMs - now) / 60000);
    return {
      serve_mode: "scheduled",
      serve_label: "Giờ phục vụ",
      serve_at: resTimeMs,
      serve_at_iso: new Date(resTimeMs).toISOString(),
      sort_key: resTimeMs,
      minutes_until_serve: minutesUntil,
      is_soon: minutesUntil <= SOON_SERVE_MINUTES && minutesUntil >= -OVERDUE_GRACE_MINUTES,
      reservation_time: reservation.reservation_time,
      reservation_status: resStatus,
      number_of_guests: reservation.number_of_guests ?? null,
    };
  }

  return {
    serve_mode: "active",
    serve_label: "Đang phục vụ",
    serve_at: orderAtMs,
    serve_at_iso: new Date(orderAtMs).toISOString(),
    sort_key: orderAtMs,
    is_urgent: true,
  };
}

function tableGroupKey(row) {
  if (row.table_id != null) return `t:${row.table_id}`;
  if (row.reservation_id) return `r:${row.reservation_id}`;
  return `o:${row.order_id}`;
}

/**
 * Gom món theo bàn; mỗi bàn một nhóm, vẫn giữ từng order_item để cập nhật trạng thái.
 */
function groupKitchenItemsByTable(itemRows) {
  const map = new Map();

  for (const row of itemRows) {
    const key = tableGroupKey(row);
    if (!map.has(key)) {
      const serve = row.serve_context || resolveKitchenServeContext(row.Order, row.Order?.Reservation);
      map.set(key, {
        table_id: row.table_id ?? null,
        table_number: row.table_number ?? null,
        reservation_id: row.Order?.reservation_id ?? row.reservation_id ?? null,
        booking_group_id: row.Order?.Reservation?.booking_group_id ?? null,
        number_of_guests: row.Order?.Reservation?.number_of_guests ?? null,
        serve_mode: serve.serve_mode,
        serve_label: serve.serve_label,
        serve_at: serve.serve_at_iso,
        serve_at_ms: serve.serve_at,
        minutes_until_serve: serve.minutes_until_serve ?? null,
        is_soon: !!serve.is_soon,
        is_urgent: !!serve.is_urgent,
        sort_key: serve.sort_key,
        items: [],
        status_counts: { pending: 0, processing: 0, done: 0, served: 0 },
      });
    }

    const group = map.get(key);
    group.items.push(row);
    const st = String(row.status || "pending").toLowerCase();
    if (group.status_counts[st] != null) group.status_counts[st] += 1;
  }

  return sortKitchenTableGroups([...map.values()]);
}

function sortKitchenTableGroups(groups) {
  return groups.sort((a, b) => {
    const modeA = a.serve_mode === "active" ? 0 : 1;
    const modeB = b.serve_mode === "active" ? 0 : 1;
    if (modeA !== modeB) return modeA - modeB;
    if (a.sort_key !== b.sort_key) return a.sort_key - b.sort_key;
    return (a.table_number ?? 9999) - (b.table_number ?? 9999);
  });
}

module.exports = {
  SOON_SERVE_MINUTES,
  resolveKitchenServeContext,
  groupKitchenItemsByTable,
  sortKitchenTableGroups,
};
