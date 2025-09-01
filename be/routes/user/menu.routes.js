const express = require('express');
const router = express.Router();
const { getAllMenuItems } = require('../../controllers/user/menu.controller');

router.get('/', getAllMenuItems);

module.exports = router;
