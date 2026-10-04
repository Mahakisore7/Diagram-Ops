const express = require('express');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateMe);
router.get('/me/export', requireAuth, authController.exportMe);
// Both re-verify the current password, so they share the login limiter -
// otherwise they would be an unthrottled password-guessing oracle.
router.post('/change-password', requireAuth, authLimiter, authController.changePassword);
router.delete('/me', requireAuth, authLimiter, authController.deleteMe);

module.exports = router;
