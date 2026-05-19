/**
 * UC08 – Đồng bộ realtime: WebSocket theo chi nhánh (bếp ↔ phục vụ).
 * Client: ws://host/ws/realtime?token=JWT&branchId=1
 */
const WebSocket = require('ws');
const { verifyAccessToken } = require('./utils/jwt');

const STAFF_ROLES = new Set(['admin', 'waiter', 'kitchen', 'manager']);

let wss = null;

function attachToHttpServer(server) {
  if (wss) return wss;

  wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    let url;
    try {
      url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    } catch {
      return;
    }
    if (url.pathname !== '/ws/realtime') return;

    const token = url.searchParams.get('token');
    const wantsBranch = Number(url.searchParams.get('branchId'));
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    if (!Number.isFinite(wantsBranch) || wantsBranch <= 0) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const role = payload.role;
    if (!STAFF_ROLES.has(role)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    let branchId = wantsBranch;
    const userBranch = payload.branch_id != null ? Number(payload.branch_id) : null;
    if (role !== 'admin' && userBranch != null && userBranch !== wantsBranch) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    if (role !== 'admin' && userBranch != null) {
      branchId = userBranch;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.subscribedBranchId = branchId;
      wss.emit('connection', ws, request);
    });
  });

  return wss;
}

/**
 * @param {number|string} branchId
 * @param {Record<string, unknown>} payload
 */
function notifyBranch(branchId, payload) {
  if (!wss) return;
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) return;
  const data = JSON.stringify({ ...payload, branchId: id });
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (Number(client.subscribedBranchId) !== id) return;
    try {
      client.send(data);
    } catch (_) {}
  });
}

module.exports = {
  attachToHttpServer,
  notifyBranch,
};
