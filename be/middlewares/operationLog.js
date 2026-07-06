/**
 * MIDDLEWARE NHẬT KÝ THAO TÁC — ghi audit log cho các hành động quan trọng.
 * Ctrl+F: operation log, auditLog, req.audit, nhật ký thao tác
 * Luồng demo: Phần 5 — Bước 5.8 xem đăng ký, đặt bàn, check-in, thanh toán trong Admin.
 */
const operationLogService = require('../services/operationLog.service');

/** [AUDIT] HTTP status được coi là thành công và sẽ ghi log mặc định. Ctrl+F: DEFAULT_SUCCESS */
const DEFAULT_SUCCESS = [200, 201, 204];

/**
 * [AUDIT] Ghi log sau khi response kết thúc (không chặn request).
 * Dùng cho route cần truy vết: đăng ký, đặt bàn, check-in, gọi món, thanh toán, đánh giá.
 * Ctrl+F: auditLog, req.audit, logOnError
 *
 * Controller có thể gán thêm trước khi res.json:
 *   req.audit = { entityId: 12, description: '...', metadata: {...} }
 */
function auditLog(options) {
  const {
    action,
    module,
    description,
    entityType,
    entityId,
    metadata,
    logOnError = false,
    successStatuses = DEFAULT_SUCCESS,
    skipBody = false,
  } = options;

  return (req, res, next) => {
    // Đợi response xong mới ghi log để biết chính xác status_code thành công/thất bại.
    res.on('finish', () => {
      const status = res.statusCode;
      const isSuccess = successStatuses.includes(status);
      if (!isSuccess && !logOnError) return;

      // Controller ưu tiên override bằng req.audit để mô tả sát nghiệp vụ từng request.
      const audit = req.audit || {};
      const resolvedEntityId =
        audit.entityId ??
        audit.entity_id ??
        (typeof entityId === 'function' ? entityId(req) : entityId) ??
        req.params.id ??
        null;

      let resolvedDescription = audit.description;
      if (!resolvedDescription) {
        if (typeof description === 'function') {
          resolvedDescription = description(req);
        } else {
          resolvedDescription = description;
        }
      }

      // Payload này được operationLogService lưu vào bảng operation_logs cho màn Admin.
      const payload = {
        action,
        module,
        description: resolvedDescription,
        entity_type: audit.entityType ?? audit.entity_type ?? entityType ?? null,
        entity_id: resolvedEntityId != null ? parseInt(resolvedEntityId, 10) || null : null,
        status_code: status,
        metadata:
          audit.metadata ??
          (typeof metadata === 'function' ? metadata(req) : metadata) ??
          null,
        request_body: skipBody
          ? null
          : audit.requestBody ?? undefined,
      };

      operationLogService.writeLog(req, payload).catch((err) => {
        console.error('[operationLog] write failed:', err.message);
      });
    });

    next();
  };
}

/** [AUDIT] Gắn req.logOperation() để controller/service tự ghi log thủ công khi cần. Ctrl+F: attachLogOperation */
function attachLogOperation(req, res, next) {
  req.logOperation = (payload) => operationLogService.writeLog(req, payload);
  next();
}

module.exports = {
  auditLog,
  attachLogOperation,
};
