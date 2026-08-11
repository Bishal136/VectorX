const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  console.error(`${req.method} ${req.originalUrl} — ${err.message}`);
  
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? (statusCode === 500 ? 'Internal server error' : err.message)
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;