// Express doesn't catch rejected promises from async route handlers on its
// own — an unhandled rejection there crashes the process instead of
// reaching the error middleware. Wrapping every controller in this once
// means no controller needs its own try/catch.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
