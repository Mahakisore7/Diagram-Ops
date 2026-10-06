const express = require('express');
const diagramController = require('../controllers/diagramController');
const requireAuth = require('../middleware/auth');
const { generateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(requireAuth);

router.post('/diagrams/generate', generateLimiter, diagramController.generate);
router.post('/diagrams', diagramController.save);
router.get('/diagrams', diagramController.list);
// Must be registered before /diagrams/:id, or Express would match "stats"
// as an :id and reject it as an invalid ObjectId.
router.get('/diagrams/stats', diagramController.stats);
router.get('/diagrams/:id', diagramController.getOne);
router.patch('/diagrams/:id', diagramController.update);
router.delete('/diagrams/:id', diagramController.remove);
router.get('/diagrams/:id/versions', diagramController.versions);
router.post('/diagrams/:id/duplicate', diagramController.duplicate);
router.post('/diagrams/:id/share', diagramController.share);
router.delete('/diagrams/:id/share', diagramController.unshare);
router.get('/activity', diagramController.listActivity);
router.get('/provider-status', diagramController.providerStatus);

module.exports = router;
