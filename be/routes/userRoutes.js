const express        = require('express');
const router         = express.Router();
const userController = require('../controllers/userController');
const authMW         = require('../middlewares/auth');

// POST /api/users/register
router.post('/register', userController.registerUser);

// GET  /api/users/me  ← đây
router.get('/me', authMW, userController.getProfile);

router.put('/me', authMW, userController.updateProfile)


module.exports = router;
