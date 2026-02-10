const ApiError = require("../utils/apiError");

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

/** تحويل أخطاء Mongoose إلى ApiError برسالة واضحة ورمز حالة مناسب */
function normalizeMongooseError(err) {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return new ApiError(messages.length ? messages.join(" ") : err.message, 400);
  }
  if (err.name === "CastError") {
    return new ApiError(`قيمة غير صالحة: ${err.path || "الحقل"}`, 400);
  }
  if (err.code === 11000) {
    const key = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
    const msg = key === "email"
      ? "البريد الإلكتروني مسجل مسبقاً."
      : key === "phone"
        ? "رقم الهاتف مستخدم من قبل."
        : "القيمة مكررة بالفعل.";
    return new ApiError(msg, 409);
  }
  return null;
}

const globalError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (err.name === "JsonWebTokenError") err = handleJwtInvalidSignature();
  if (err.name === "TokenExpiredError") err = handleJwtExpired();

  const mongooseNormalized = normalizeMongooseError(err);
  if (mongooseNormalized) err = mongooseNormalized;

  if (process.env.NODE_ENV === "development") {
    sendErrorForDev(err, res);
  } else {
    if (err.name === "JsonWebTokenError") err = handleJwtInvalidSignature();
    if (err.name === "TokenExpiredError") err = handleJwtExpired();
    const again = normalizeMongooseError(err);
    if (again) err = again;
    sendErrorForProd(err, res);
  }
};

module.exports = globalError;
