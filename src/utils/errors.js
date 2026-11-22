// Makes an Error that also carries an HTTP status and a short code.
// The central error middleware (middlewares/errorHandler.js) turns it into a JSON response.
function createError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

module.exports = { createError };
