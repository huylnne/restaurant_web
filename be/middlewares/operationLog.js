const operationLogService = require('../services/operationLog.service');

const DEFAULT_SUCCESS = [200, 201, 204];

/**
 * Ghi log sau khi response kết thúc (không chặn request).
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
    res.on('finish', () => {
      const status = res.statusCode;
      const isSuccess = successStatuses.includes(status);
      if (!isSuccess && !logOnError) return;

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

/** Gắn req.logOperation() để ghi log thủ công trong controller/service */
function attachLogOperation(req, res, next) {
  req.logOperation = (payload) => operationLogService.writeLog(req, payload);
  next();
}

module.exports = {
  auditLog,
  attachLogOperation,
};
