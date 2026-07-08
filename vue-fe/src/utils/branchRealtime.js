/**
 * UC08 – Kết nối WebSocket theo chi nhánh (đồng bộ bếp / phục vụ).
 * @param {string} httpApiBase Ví dụ https://restaurantweb-production-8995.up.railway.app
 * @param {number} branchId
 * @param {(msg: Record<string, unknown>) => void} onEvent
 * @returns {() => void} Hàm gỡ kết nối
 */
export function connectBranchRealtime(httpApiBase, branchId, onEvent) {
  // Cần token + branchId hợp lệ; thiếu thì trả hàm cleanup rỗng (không kết nối).
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  if (!token || branchId == null || branchId === "") {
    return () => {};
  }

  // Đổi http(s) → ws(s) để mở WebSocket đúng scheme.
  const wsBase = httpApiBase.replace(/^https/i, "wss").replace(/^http/i, "ws");
  let ws;
  let disposed = false; // đánh dấu đã gọi cleanup → ngừng auto-reconnect
  let reconnectTimer = null;

  // Đính token + branchId vào query để server verify và gán đúng nhóm chi nhánh.
  const buildUrl = () =>
    `${wsBase}/ws/realtime?token=${encodeURIComponent(token)}&branchId=${encodeURIComponent(String(branchId))}`;

  // Tự kết nối lại sau 3.5s khi rớt (trừ khi đã dispose).
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

  // Hàm dọn dẹp trả về cho caller: gọi khi rời trang/unmount để đóng socket và hủy reconnect.
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
