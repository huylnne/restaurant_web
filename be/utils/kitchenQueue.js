const { ORDER_STATUS } = require("./orderStatus");

/** Trước giờ đến bao nhiêu phút thì coi là "sắp phục vụ" (nhắc bếp). */
const SOON_SERVE_MINUTES = 15;
/** Cho phép làm món trễ giờ đặt một chút (khách trễ). */
const OVERDUE_GRACE_MINUTES = 30;

const AT_TABLE_STATUSES = new Set([
  ORDER_STATUS.PRE_ORDERED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.WAITING_PAYMENT,
]);

/**
 * Ngữ cảnh phục vụ cho bếp: đặt trước theo giờ bàn vs đang phục vụ tại bàn.
 */
function resolveKitchenServeContext(order) {
  const now = Date.now();
  const orderStatus = String(order?.status || "").toLowerCase();
  const arrivalMs = order?.arrival_time
    ? new Date(order.arrival_time).getTime()
    : null;
  const orderAtMs = order?.created_at ? new Date(order.created_at).getTime() : now;

  if (AT_TABLE_STATUSES.has(orderStatus)) {
    return {
      serve_mode: "active",
      serve_label: "Đang phục vụ",
      serve_at: orderAtMs,
      serve_at_iso: new Date(orderAtMs).toISOString(),
      sort_key: orderAtMs,
      is_urgent: true,
    };
  }

  if (order?.order_type === "reservation" && arrivalMs) {
    const minutesUntil = Math.round((arrivalMs - now) / 60000);
    return {
      serve_mode: "scheduled",
      serve_label: "Giờ phục vụ",
      serve_at: arrivalMs,
      serve_at_iso: new Date(arrivalMs).toISOString(),
      sort_key: arrivalMs,
      minutes_until_serve: minutesUntil,
      is_soon: minutesUntil <= SOON_SERVE_MINUTES && minutesUntil >= -OVERDUE_GRACE_MINUTES,
      arrival_time: order.arrival_time,
      order_status: orderStatus,
      number_of_guests: order.number_of_guests ?? null,
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

function orderedAtMs(row) {
  const raw = row?.ordered_at ?? row?.order_created_at ?? row?.Order?.created_at;
  return raw ? new Date(raw).getTime() : Date.now();
}

function tableGroupKey(row) {
  if (row.table_id != null) return `t:${row.table_id}`;
  if (row.order_id) return `o:${row.order_id}`;
  return `x:${row.order_item_id ?? Math.random()}`;
}

/**
 * Gom món theo bàn; mỗi bàn một nhóm, vẫn giữ từng order_item để cập nhật trạng thái.
 */
function groupKitchenItemsByTable(itemRows) {
  const map = new Map();

  for (const row of itemRows) {
    const key = tableGroupKey(row);
    if (!map.has(key)) {
      const order = row.Order ?? null;
      const serve = row.serve_context || resolveKitchenServeContext(order);
      map.set(key, {
        table_id: row.table_id ?? null,
        table_number: row.table_number ?? null,
        order_id: order?.order_id ?? row.order_id ?? null,
        booking_group_id: order?.booking_group_id ?? null,
        number_of_guests: order?.number_of_guests ?? null,
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

  for (const group of map.values()) {
    if (group.serve_mode === "active" && group.items.length) {
      const serveMs = Math.min(...group.items.map(orderedAtMs));
      group.serve_at_ms = serveMs;
      group.serve_at = new Date(serveMs).toISOString();
      group.sort_key = serveMs;
    }
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
