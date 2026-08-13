const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  console.error(`${req.method} ${req.originalUrl} — ${err.message}`);
  
  const response = {
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? (statusCode === 500 ? 'Internal server error' : err.message)
      : err.message
  };

  // Include validation field errors if present
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors;
  }

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};

module.exports = errorHandler;