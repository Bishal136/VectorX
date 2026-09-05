const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle Multer and Busboy multipart errors (e.g. boundary missing, file too large)
  if (err.name === 'MulterError' || (typeof err.message === 'string' && err.message.includes('Multipart:'))) {
    statusCode = 400;
    message = err.message;
  }

  // Handle Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for ${err.path}: ${err.value}`;
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} "${value}" already exists. Please choose a different value.`;
  }

  // Handle Mongoose schema validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join('; ');
  }

  // Handle JWT authentication errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  console.error(`${req.method} ${req.originalUrl} [${statusCode}] — ${message}`);

  const response = {
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? (statusCode === 500 ? 'Internal server error' : message)
      : message
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