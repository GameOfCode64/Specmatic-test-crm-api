const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorMiddleware;
export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Server error";

  if (status >= 500) {
    // Log unexpected errors for debugging; don't leak internals to the client
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
  });
};
