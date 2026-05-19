import { ElNotification } from "element-plus";
import { getCurrentUser } from "@/utils/adminScope";

/** Tránh toast trùng khi WS + polling cùng lúc */
const recentKeys = new Map();
const DEDUPE_MS = 10000;

const STAFF_ALERT_ROLES = new Set(["waiter", "admin", "manager"]);

export function canReceiveKitchenDoneAlerts() {
  return STAFF_ALERT_ROLES.has(getCurrentUser()?.role);
}

/**
 * @param {{ dishName?: string, tableNumber?: number|string|null, orderItemId?: number }} payload
 */
export function notifyKitchenDishDone(payload = {}) {
  if (!canReceiveKitchenDoneAlerts()) return;

  const dish = payload.dishName ? String(payload.dishName) : "Món";
  const tableLabel =
    payload.tableNumber != null && payload.tableNumber !== ""
      ? `Bàn ${payload.tableNumber}`
      : "Khách";
  const key = payload.orderItemId != null ? `oi:${payload.orderItemId}` : `${dish}@${tableLabel}`;
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last != null && now - last < DEDUPE_MS) return;
  recentKeys.set(key, now);

  ElNotification({
    title: "Bếp — món xong",
    message: `${dish} · ${tableLabel}`,
    type: "success",
    position: "top-right",
    duration: 9000,
    showClose: true,
    // Dialog bàn thường z-index ~2000 — đặt cao để không bị che
    zIndex: 30000,
  });
}

export function handleKitchenRealtimeMessage(msg) {
  if (!msg || msg.type !== "order_item_status") return;
  if (String(msg.status || "").toLowerCase() !== "done") return;
  notifyKitchenDishDone({
    dishName: msg.menu_name,
    tableNumber: msg.table_number,
    orderItemId: msg.order_item_id,
  });
}
