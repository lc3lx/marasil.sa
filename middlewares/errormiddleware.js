const ApiError = require("../utils/apiError");

// customize the error message
// hanling errors in express
const sendErrorForDev = (err, res) =>
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });

const sendErrorForProd = (err, res) =>
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });

const handleJwtInvalidSignature = () =>
  new ApiError("Invalid token, please login again..", 401);

const handleJwtExpired = () =>
  new ApiError("Expired token, please login again..", 401);

const globalError = (err, req, res, next) => {
  // Set default status code if not already set in ApiiError
  // the first part from err.statusCode: This refers to the statusCode property of the err object, which is typically used to store an HTTP status code
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (err.name === "JsonWebTokenError") err = handleJwtInvalidSignature();
  if (err.name === "TokenExpiredError") err = handleJwtExpired();

  if (process.env.NODE_ENV === "development") {
    sendErrorForDev(err, res);
  } else {
    if (err.name === "JsonWebTokenError") err = handleJwtInvalidSignature();
    if (err.name === "TokenExpiredError") err = handleJwtExpired();
    sendErrorForProd(err, res);
  }
};

module.exports = globalError;
