// Central error-handling middleware. Every controller sends its errors here with next(err).

// used when no route matched
function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Cannot ' + req.method + ' ' + req.originalUrl } });
}


function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong on our side';
  let details = undefined;

  if (err.type === 'entity.parse.failed') {
    // the request body was not valid JSON
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  } else if (err.status) {
    // an error we created ourselves with createError()
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.code === 'ER_DUP_ENTRY') {
    // MySQL: a UNIQUE rule was broken
    status = 409;
    code = 'DUPLICATE';
    message = 'This value already exists';
    if (err.message.includes('uq_patients_email')) {
      code = 'EMAIL_TAKEN';
      message = 'A patient with this email already exists';
    }
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    // MySQL: a foreign key stops us from deleting
    status = 409;
    code = 'HAS_APPOINTMENTS';
    message = 'Cannot delete: this record still has appointments';
  } else {
    console.error(err);
  }

  const body = { error: { code: code, message: message } };
  if (details) {
    body.error.details = details;
  }
  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
