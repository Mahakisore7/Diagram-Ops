// generateLimiter and authLimiter skip themselves when NODE_ENV=test (see
// src/middleware/rateLimit.js) so the rest of the suite isn't coupled to a
// production-tuned request threshold. That means nothing else in this
// suite actually exercises the limiter's own logic — so this file
// deliberately flips NODE_ENV around each test to prove the limiter
// itself, in isolation, does what NFR-S4 requires.
const express = require('express');
const request = require('supertest');
const { generateLimiter } = require('../src/middleware/rateLimit');
const { rateLimitMax } = require('../src/config/env');
const requestId = require('../src/middleware/requestId');
const { errorHandler } = require('../src/middleware/errorHandler');

// Mirrors the relevant slice of the real app.js wiring — a rate-limited
// route followed by requestId + errorHandler — so a 429 comes back as the
// same JSON envelope real clients see, not Express's bare default handler.
function buildApp(userId) {
  const app = express();
  app.use(requestId);
  app.use((req, _res, next) => {
    req.userId = userId;
    next();
  });
  app.get('/generate', generateLimiter, (_req, res) => res.status(200).json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('generateLimiter — NFR-S4', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it(
    'allows exactly the configured max requests per user, then 429s',
    async () => {
      const app = buildApp('rl-user-solo');

      for (let i = 0; i < rateLimitMax; i++) {
        const res = await request(app).get('/generate');
        expect(res.status).toBe(200);
      }

      const blocked = await request(app).get('/generate');
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
    },
    20000,
  );

  it(
    "keys the limit per user — hitting user A's limit does not affect user B",
    async () => {
      const appA = buildApp('rl-user-a');
      for (let i = 0; i < rateLimitMax; i++) {
        await request(appA).get('/generate');
      }
      const blockedA = await request(appA).get('/generate');
      expect(blockedA.status).toBe(429);

      const appB = buildApp('rl-user-b');
      const freshUser = await request(appB).get('/generate');
      expect(freshUser.status).toBe(200);
    },
    20000,
  );
});
