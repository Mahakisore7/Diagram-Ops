const express = require('express');
const diagramController = require('../controllers/diagramController');
const requireAuth = require('../middleware/auth');
const { generateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(requireAuth);

router.post('/diagrams/generate', generateLimiter, diagramController.generate);
router.post('/diagrams', diagramController.save);
router.get('/diagrams', diagramController.list);
router.get('/diagrams/:id', diagramController.getOne);
router.patch('/diagrams/:id', diagramController.update);
router.delete('/diagrams/:id', diagramController.remove);
router.get('/provider-status', diagramController.providerStatus);

module.exports = router;
