// be/routes/payments.route.js
const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/user/payments.controller');

router.post('/session', ctrl.createSession);
router.post('/webhook/momo', express.json({ type: '*/*' }), ctrl.momoWebhook);
router.get('/return', ctrl.paymentReturn);
router.get('/by-order/:id', ctrl.getPaymentByOrder);

module.exports = router;
