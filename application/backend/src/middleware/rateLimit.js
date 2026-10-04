const rateLimit = require('express-rate-limit');
const { rateLimitWindowMs, rateLimitMax } = require('../config/env');
const ApiError = require('../utils/ApiError');

function tooManyRequests(req, res, next, options) {
  next(new ApiError(429, 'RATE_LIMITED', options.message));
}

// Keyed by userId, not IP — the ALB in front of every deployed instance
// means every request arrives from the same handful of load-balancer IPs
// (see app.js's `trust proxy` setting for the other half of this). An
// IP-keyed limiter behind a shared ALB rate-limits everyone as one bucket;
// this route already runs after requireAuth, so req.userId is always set.
// `skip` in test env, not a higher limit: a test suite firing many requests
// in a tight loop isn't "a real user making a lot of requests" — it's
// exercising unrelated code paths, and shouldn't be coupled to whatever
// threshold production happens to be tuned to today.
const isTestEnv = () => process.env.NODE_ENV === 'test';

const generateLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  keyGenerator: (req) => req.userId,
  skip: isTestEnv,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many generation requests. Please slow down.',
  handler: tooManyRequests,
});

// A separate, IP-keyed limiter for register/login — slows down credential
// stuffing and brute-force attempts without needing a signed-in identity
// to key on (there isn't one yet at this point in the flow).
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: isTestEnv,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts. Please wait a minute and try again.',
  handler: tooManyRequests,
});

// IP-keyed limiter for unauthenticated share-link views. Generous enough
// for a link pasted into a team chat, tight enough that enumerating tokens
// from one address is pointless on top of their 144-bit entropy.
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  skip: isTestEnv,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please wait a minute and try again.',
  handler: tooManyRequests,
});

module.exports = { generateLimiter, authLimiter, publicLimiter };
