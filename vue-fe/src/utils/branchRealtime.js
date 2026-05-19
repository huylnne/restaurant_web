/**
 * UC08 – Kết nối WebSocket theo chi nhánh (đồng bộ bếp / phục vụ).
 * @param {string} httpApiBase Ví dụ http://localhost:3000
 * @param {number} branchId
 * @param {(msg: Record<string, unknown>) => void} onEvent
 * @returns {() => void} Hàm gỡ kết nối
 */
export function connectBranchRealtime(httpApiBase, branchId, onEvent) {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  if (!token || branchId == null || branchId === "") {
    return () => {};
  }

  const wsBase = httpApiBase.replace(/^https/i, "wss").replace(/^http/i, "ws");
  let ws;
  let disposed = false;
  let reconnectTimer = null;

  const buildUrl = () =>
    `${wsBase}/ws/realtime?token=${encodeURIComponent(token)}&branchId=${encodeURIComponent(String(branchId))}`;

  function scheduleReconnect() {
    if (disposed) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 3500);
  }

  function connect() {
    if (disposed) return;
    try {
      ws = new WebSocket(buildUrl());
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (typeof onEvent === "function") onEvent(msg);
      } catch {
        /* ignore invalid payload */
      }
    };

    ws.onclose = () => {
      if (!disposed) scheduleReconnect();
    };

    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        /* noop */
      }
    };
  }

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    try {
      ws?.close();
    } catch {
      /* noop */
    }
  };
}
