const express = require('express');
const router = express.Router();
const operationLogController = require('../../controllers/admin/operationLog.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');

router.use(verifyToken, authorizeRole('admin', 'manager'));

router.get('/', operationLogController.list);

module.exports = router;
