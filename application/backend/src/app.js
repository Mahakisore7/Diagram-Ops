const express = require('express');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const diagramRoutes = require('./routes/diagramRoutes');
const publicRoutes = require('./routes/publicRoutes');
const requestId = require('./middleware/requestId');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { isConnected } = require('./db/connect');

function createApp() {
  const app = express();

  // Behind the AWS ALB (and later, the K8s Ingress), the real client IP
  // arrives in X-Forwarded-For, not as the raw TCP peer address. Without
  // this, express-rate-limit and req.ip both see the ALB's IP for every
  // request — one shared bucket for every user behind it. `1` trusts
  // exactly one hop; trusting an unbounded number would let a client
  // spoof its own rate-limit key via a forged header.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);

  // Liveness/readiness are mounted first and are deliberately never
  // rate-limited or authenticated. Kubernetes polls /healthz continuously;
  // gating it behind the same limiter as user traffic would make
  // Kubernetes kill healthy pods under real load. See FR-O1/FR-O2 in
  // docs/functional-spec.md for why liveness and readiness are separate.
  app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));
  app.get('/readyz', (req, res) => {
    if (isConnected()) return res.status(200).json({ status: 'ready' });
    res.status(503).json({ status: 'not ready' });
  });

  app.use('/api/auth', authRoutes);
  // Before the authenticated /api router - see routes/publicRoutes.js.
  app.use('/api/public', publicRoutes);
  app.use('/api', diagramRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
