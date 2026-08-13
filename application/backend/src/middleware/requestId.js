const crypto = require('crypto');

// A request ID lets a user paste one string into a bug report and you find
// the exact log line for their exact request — see the error envelope in
// docs/functional-spec.md §6. Honoring an incoming x-request-id means a
// trace that starts at the frontend keeps the same ID all the way through,
// once Phase 15 wires up tracing.
function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}

module.exports = requestId;
