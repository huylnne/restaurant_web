/**
 * SERVICE OPERATION LOG — ghi và truy vấn nhật ký thao tác cho màn Admin.
 * Ctrl+F: operation log service, sanitizeBody, writeLog, listLogs
 * Luồng demo: Phần 5 — Bước 5.8 truy vết thao tác đăng ký/đặt bàn/check-in/thanh toán.
 */
const { Op } = require('sequelize');
const db = require('../models/db');
const { resolveBranchId } = require('../utils/branchScope');

/** [AUDIT] Field nhạy cảm luôn bị che khi ghi request_body. Ctrl+F: SENSITIVE_KEYS */
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'newPassword',
  'oldPassword',
  'confirmPassword',
  'token',
  'refreshToken',
]);

/** [AUDIT] Đệ quy che password/token trước khi lưu log. Ctrl+F: sanitizeBody */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const clone = Array.isArray(body) ? [...body] : { ...body };
  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.has(key)) {
        obj[key] = '[REDACTED]';
      } else if (obj[key] && typeof obj[key] === 'object') {
        scrub(obj[key]);
      }
    }
    return obj;
  };
  return scrub(clone);
}

/** [AUDIT] Lấy IP thật, ưu tiên x-forwarded-for khi chạy sau proxy. Ctrl+F: getClientIp */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/** [AUDIT] Actor thao tác: user_id/username/role/branch_id từ request. Ctrl+F: buildActor */
function buildActor(req) {
  return {
    user_id: req.userId ?? req.user?.user_id ?? null,
    username: req.user?.username ?? null,
    role: req.userRole ?? req.user?.role ?? null,
    branch_id: resolveBranchId(req, req.body?.branch_id ?? req.query?.branch_id, null),
  };
}

/** [AUDIT] Ghi một OperationLog record từ req + payload middleware/controller. Ctrl+F: writeLog */
async function writeLog(req, payload = {}) {
  const actor = buildActor(req);
  const record = {
    user_id: payload.user_id ?? actor.user_id,
    username: payload.username ?? actor.username,
    role: payload.role ?? actor.role,
    branch_id: payload.branch_id ?? actor.branch_id,
    action: payload.action,
    module: payload.module,
    description: payload.description ?? null,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
    http_method: payload.http_method ?? req.method,
    path: payload.path ?? req.originalUrl ?? req.url,
    ip_address: payload.ip_address ?? getClientIp(req),
    user_agent: payload.user_agent ?? req.headers['user-agent'] ?? null,
    request_body:
      payload.request_body !== undefined
        ? payload.request_body
        : sanitizeBody(req.body),
    metadata: payload.metadata ?? null,
    status_code: payload.status_code ?? null,
  };

  if (!record.action || !record.module) {
    throw new Error('operation log requires action and module');
  }

  return db.OperationLog.create(record);
}

/** [NHẬT KÝ] Query log có phân trang/filter module/action/user/entity/time/search. Ctrl+F: listLogs */
async function listLogs(req, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = {};
  if (query.module) where.module = query.module;
  if (query.action) where.action = query.action;
  if (query.user_id) where.user_id = parseInt(query.user_id, 10);
  if (query.entity_type) where.entity_type = query.entity_type;
  if (query.entity_id) where.entity_id = parseInt(query.entity_id, 10);

  const branchId = resolveBranchId(req, query.branch_id, null);
  if (branchId) where.branch_id = branchId;

  if (query.from || query.to) {
    where.created_at = {};
    if (query.from) where.created_at[Op.gte] = new Date(query.from);
    if (query.to) where.created_at[Op.lte] = new Date(query.to);
  }

  if (query.search) {
    const term = `%${String(query.search).trim()}%`;
    where[Op.or] = [
      { description: { [Op.iLike]: term } },
      { username: { [Op.iLike]: term } },
      { action: { [Op.iLike]: term } },
    ];
  }

  const { count, rows } = await db.OperationLog.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
    include: [
      {
        model: db.User,
        attributes: ['user_id', 'username', 'full_name', 'role'],
        required: false,
      },
    ],
  });

  return {
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

module.exports = {
  sanitizeBody,
  writeLog,
  listLogs,
};
