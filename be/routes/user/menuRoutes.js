const express = require('express');
const router = express.Router();
const { getAllMenuItems } = require('../../controllers/user/menuController');

router.get('/', getAllMenuItems);

module.exports = router;
