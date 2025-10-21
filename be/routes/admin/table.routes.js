const express = require('express');
const router = express.Router();
const tableController = require('../../controllers/admin/table.controller');
const { verifyAdmin } = require('../../middlewares/auth');

router.use(verifyAdmin);

router.get('/', verifyAdmin, tableController.getTables);
router.get('/summary', verifyAdmin, tableController.getTableSummary);
router.get('/activity', verifyAdmin, tableController.getTableActivities);


router.post('/', verifyAdmin, tableController.createTable);
router.put('/:id', verifyAdmin, tableController.updateTable);
router.delete('/:id', verifyAdmin, tableController.deleteTable);

module.exports = router;