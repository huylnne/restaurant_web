/**
 * REALTIME HUB — WebSocket theo chi nhánh để đồng bộ bếp ↔ phục vụ ↔ sơ đồ bàn.
 * Ctrl+F: realtimeHub, attachToHttpServer, notifyBranch, WebSocket realtime
 * UC08 – Đồng bộ realtime: WebSocket theo chi nhánh (bếp ↔ phục vụ).
 * Client: ws://host/ws/realtime?token=JWT&branchId=1
 */
const WebSocket = require('ws');
const { verifyAccessToken } = require('./utils/jwt');

const STAFF_ROLES = new Set(['admin', 'waiter', 'kitchen', 'manager']);

let wss = null;

/** [WEBSOCKET] Gắn upgrade handler vào HTTP server, verify JWT/role/branch trước khi subscribe. Ctrl+F: attachToHttpServer */
function attachToHttpServer(server) {
  if (wss) return wss;

  wss = new WebSocket.Server({ noServer: true });

  // Bắt sự kiện HTTP "upgrade" (client xin nâng cấp kết nối lên WebSocket).
  server.on('upgrade', (request, socket, head) => {
    // B1: parse URL để lấy pathname + query. Lỗi định dạng → bỏ qua.
    let url;
    try {
      url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    } catch {
      return;
    }
    // Chỉ nhận đúng đường dẫn realtime; các upgrade khác không xử lý.
    if (url.pathname !== '/ws/realtime') return;

    // B2: đọc token (JWT) và branchId client muốn subscribe từ query string.
    const token = url.searchParams.get('token');
    const wantsBranch = Number(url.searchParams.get('branchId'));
    // Thiếu token → 401.
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    // branchId không hợp lệ → 400.
    if (!Number.isFinite(wantsBranch) || wantsBranch <= 0) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    // B3: verify JWT; sai/hết hạn → 401.
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // B4: chỉ nhân viên (admin/waiter/kitchen/manager) mới được kết nối realtime; khách thường → 403.
    const role = payload.role;
    if (!STAFF_ROLES.has(role)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // B5: chống nghe lén chi nhánh khác. Nhân viên non-admin chỉ được subscribe đúng chi nhánh của mình.
    let branchId = wantsBranch;
    const userBranch = payload.branch_id != null ? Number(payload.branch_id) : null;
    if (role !== 'admin' && userBranch != null && userBranch !== wantsBranch) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    // Ép branch của non-admin về đúng chi nhánh trong token (bỏ qua giá trị client tự khai).
    if (role !== 'admin' && userBranch != null) {
      branchId = userBranch;
    }

    // B6: hoàn tất bắt tay, ghi nhớ chi nhánh subscribe lên socket để notifyBranch lọc gửi đúng nhóm.
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.subscribedBranchId = branchId;
      wss.emit('connection', ws, request);
    });
  });

  return wss;
}

/**
 * [WEBSOCKET] Broadcast payload cho tất cả client đang subscribe cùng branch.
 * Ctrl+F: notifyBranch, order_item_status, order_flow
 *
 * @param {number|string} branchId
 * @param {Record<string, unknown>} payload
 */
function notifyBranch(branchId, payload) {
  if (!wss) return; // chưa khởi tạo WebSocket server thì bỏ qua
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) return;
  // Đóng gói message kèm branchId để client biết message thuộc chi nhánh nào.
  const data = JSON.stringify({ ...payload, branchId: id });
  // Duyệt mọi client đang kết nối, chỉ gửi cho client đang mở VÀ subscribe đúng chi nhánh.
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (Number(client.subscribedBranchId) !== id) return;
    try {
      client.send(data);
    } catch (_) {} // lỗi gửi 1 client không được làm hỏng vòng lặp broadcast
  });
}

module.exports = {
  attachToHttpServer,
  notifyBranch,
};
