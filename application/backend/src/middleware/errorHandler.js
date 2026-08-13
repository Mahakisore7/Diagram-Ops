const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'No such route.', requestId: req.id },
  });
}

// Every error — expected (ApiError) or not — funnels through here, so the
// response shape is identical everywhere (see the error envelope in
// docs/functional-spec.md §6) and unexpected errors never leak a stack
// trace or internal message to the client. Details go to the server log,
// tagged with the request ID, which is the only thing the client sees.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, requestId: req.id },
    });
  }

  console.error(JSON.stringify({
    level: 'error',
    requestId: req.id,
    message: err.message,
    stack: err.stack,
  }));

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', requestId: req.id },
  });
}

module.exports = { notFoundHandler, errorHandler };
