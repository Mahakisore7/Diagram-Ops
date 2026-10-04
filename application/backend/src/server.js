const { port } = require('./config/env');
const http = require('http');
const createApp = require('./app');
const db = require('./db/connect');

// Phase 6 pipeline verification: this comment is a deliberate, no-op change
// scoped to application/backend/ so the Jenkinsfile.backend "Check Relevant
// Changes" guard lets a real run through SonarQube, OWASP, Docker build,
// Trivy, and ECR push.

async function start() {
  await db.connect();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(port, () => {
    console.log(JSON.stringify({ level: 'info', message: `Diagram-Ops backend listening on port ${port}` }));
  });

  // FR-O6: stop accepting new connections, let in-flight requests finish,
  // close the DB connection, then exit. Without this, a rolling
  // Kubernetes deploy (Phase 7) kills pods mid-request — SIGTERM is what
  // Kubernetes sends before the harder SIGKILL that follows
  // terminationGracePeriodSeconds.
  const shutdown = (signal) => {
    console.log(JSON.stringify({ level: 'info', message: `${signal} received, shutting down gracefully` }));
    server.close(async () => {
      await db.disconnect();
      process.exit(0);
    });

    // Force-exit if connections don't drain in time, so one stuck request
    // can't hold the pod open past Kubernetes' grace period.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error(JSON.stringify({ level: 'error', message: 'Failed to start server', error: err.message }));
  process.exit(1);
});
