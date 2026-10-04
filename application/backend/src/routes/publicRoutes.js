const express = require('express');
const diagramController = require('../controllers/diagramController');
const { publicLimiter } = require('../middleware/rateLimit');

// Everything here is reachable WITHOUT a token. Mounted in app.js before the
// authenticated /api router, whose router-level requireAuth would
// otherwise reject these requests first.
const router = express.Router();

router.get('/diagrams/:token', publicLimiter, diagramController.viewShared);

module.exports = router;
