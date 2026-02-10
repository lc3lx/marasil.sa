const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ApiError = require("../utils/apiError");
const sendmail = require("../utils/SendMail");
const Customer = require("../models/customerModel");
const Employee = require("../models/employeeModel");
const createToken = require("../utils/createToken");
const { sanitizeUser } = require("../utils/sanitizeData");

// @desc    Signup
// @route   POST /api/auth/signup
// @access  Public
exports.SignUp = asyncHandler(async (req, res, next) => {
  try {
    // 1- Create user (validation already done by SignUpValidator)
    const customer = await Customer.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone || undefined,
      email: req.body.email,
      password: req.body.password,
    });

    // 2- Generate token
    const token = createToken(customer._id);

    res.status(201).json({ data: sanitizeUser(customer), token });
  } catch (err) {
    // معالجة أخطاء Mongoose: تكرار البريد أو الهاتف أو أخطاء التحقق
    if (err.name === "ValidationError") {
      const firstMsg = err.message || Object.values(err.errors || {}).map((e) => e.message).join(". ");
      return next(new ApiError(firstMsg, 400));
    }
    if (err.code === 11000) {
      const field = err.keyValue?.email ? "email" : err.keyValue?.phone ? "phone" : "field";
      const msg = field === "email"
        ? "البريد الإلكتروني مسجل مسبقاً. استخدم بريداً آخر أو سجّل الدخول."
        : "رقم الهاتف مستخدم من قبل. استخدم رقماً آخر أو سجّل الدخول.";
      return next(new ApiError(msg, 409));
    }
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      return next(err);
    }
    return next(new ApiError("فشل إنشاء الحساب. يرجى المحاولة لاحقاً أو التواصل مع الدعم.", 500));
  }
});

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
exports.LogIn = asyncHandler(async (req, res, next) => {
  try {
    const email = req.body?.email?.trim?.();
    const password = req.body?.password;

    if (!email || !password) {
      return next(new ApiError("البريد الإلكتروني وكلمة المرور مطلوبان.", 400));
    }

    const customer = await Customer.findOne({ email: email.toLowerCase() });

    if (!customer) {
      return next(new ApiError("البريد الإلكتروني أو كلمة المرور غير صحيحة.", 401));
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      return next(new ApiError("البريد الإلكتروني أو كلمة المرور غير صحيحة.", 401));
    }

    // التحقق من أن الحساب نشط
    if (customer.active === false) {
      return next(new ApiError("حسابك غير نشط. يرجى التواصل مع الدعم لتفعيل الحساب.", 403));
    }

    const token = createToken(customer._id);
    delete customer._doc.password;

    res.status(200).json({ data: sanitizeUser(customer), token });
  } catch (err) {
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      return next(err);
    }
    return next(new ApiError("فشل تسجيل الدخول. يرجى المحاولة لاحقاً أو التواصل مع الدعم.", 500));
  }
});

// @desc   make sure the user is logged in
exports.Protect = asyncHandler(async (req, res, next) => {
  // 1) Check if token exist, if exist get
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError(
        "You are not login, Please login to get access this route",
        401
      )
    );
  }

  // 2) Verify token (no change happens, expired token)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // 3) Check if user exists
  const currentUser = await Customer.findById(decoded.customerId);
  if (!currentUser) {
    return next(
      new ApiError(
        "The user that belong to this token does no longer exist",
        401
      )
    );
  }

  // 4) Check if user change his password after token created
  if (currentUser.passwordChangedAt) {
    // getTime is method convert date to timestamp
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    // Password changed after token created (Error)
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed his password. please login again..",
          401
        )
      );
    }
  }

  // store authenticated user in req.user
  req.customer = currentUser;
  next();
});

// @desc   Admin and Employee Protection
exports.ProtectEmployee = asyncHandler(async (req, res, next) => {
  // 1) Check if token exist, if exist get
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.headers["x-auth-token"]) {
    // Also check x-auth-token header
    token = req.headers["x-auth-token"];
  }

  if (!token) {
    return next(
      new ApiError(
        "You are not login, Please login to get access this route",
        401
      )
    );
  }

  // 2) Verify token (no change happens, expired token)
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY || process.env.JWT_SECRET
    );
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new ApiError("Your token has expired. Please login again", 401)
      );
    }
    if (error.name === "JsonWebTokenError") {
      return next(new ApiError("Invalid token. Please login again", 401));
    }
    return next(
      new ApiError("Token verification failed. Please login again", 401)
    );
  }

  // 3) Check if user exists (try admin first, then employee)
  let currentUser = null;
  let userType = null;

  // Try to find admin/customer first
  if (decoded.customerId) {
    currentUser = await Customer.findById(decoded.customerId);
    if (currentUser) {
      userType = "admin";
    }
  }

  if (!currentUser && decoded.id) {
    // Try to find employee
    currentUser = await Employee.findById(decoded.id);
    if (currentUser) {
      userType = "employee";
    }
  }

  if (!currentUser) {
    return next(
      new ApiError(
        "The user that belong to this token does no longer exist",
        401
      )
    );
  }

  // 4) Check if user change his password after token created (for employees only)
  if (userType === "employee" && currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed his password. please login again..",
          401
        )
      );
    }
  }

  // store authenticated user in req.user and req.customer (for admin compatibility)
  req.user = currentUser;
  req.userType = userType;
  req.userRole = userType === "employee" ? "employee" : currentUser.role;

  // Also set req.customer for admin routes that expect it
  if (userType === "admin") {
    req.customer = currentUser;
  }

  next();
});

// @desc   Admin only
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // 1) access to roles
    if (!roles.includes(req.customer.role)) {
      return next(
        new ApiError("You are not authorized to access this route", 403)
      );
    }
    next();
  });

// @desc   Admin or Employee with permissions
exports.allowedToEmployee = (...allowedRoles) =>
  asyncHandler(async (req, res, next) => {
    // Allow admin access to all routes
    if (req.userType === "admin") {
      return next();
    }

    // For employees, check permissions
    if (req.userType === "employee") {
      const hasPermission = allowedRoles.some((role) => {
        if (role === "employee") return true;
        return req.user.permissions && req.user.permissions.includes(role);
      });

      if (!hasPermission) {
        return next(
          new ApiError("You are not authorized to access this route", 403)
        );
      }
      return next();
    }

    return next(
      new ApiError("You are not authorized to access this route", 403)
    );
  });

// @desc forgot password
// @route POST /api/v1/auth/forgotpassword
// @access Public

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  //1) check if user exists by (email)
  const customer = await Customer.findOne({ email: req.body.email });
  if (!customer) {
    return next(
      new ApiError(`There is no email for this ${req.body.email}`, 404)
    );
  }

  //2) Generate random restcode  from 6 digit characters
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedrestcode = crypto
    .createHash("sha256")
    .update(resetCode) // input as string
    .digest("hex");
  // console.log(resetCode);
  // console.log(hashedrestcode);

  // save the hashed restcode in the database
  customer.passwordResetCode = hashedrestcode;
  customer.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  customer.passwordResetVerified = false;

  await customer.save(); // save in db

  // 3) send restcode to the email
  const message = `Hi ${customer.firstName},\n We received a request to reset the password on your Marasil Account. \n ${resetCode} \n Enter this code to complete the reset. \n Thanks for helping us keep your account secure.\n The Marasil Team`;

  try {
    sendmail({
      to: customer.email,
      subject: "Your password reset code (valid for 10 min)",
      text: message,
    });
  } catch (err) {
    customer.passwordResetCode = undefined;
    customer.passwordResetExpires = undefined;
    customer.passwordResetVerified = undefined;
    await customer.save();
    return next(new ApiError("Failed to send email", 500));
  }
  res.status(200).json({ message: "Reset code sent successfully" });
});
// @desc verfiy password
// @route POST /api/auth/verfiypassword
// @access Public

exports.verfiypassRestCode = asyncHandler(async (req, res, next) => {
  // 1) Get user based on reset code
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode)
    .digest("hex");

  // $gt : oprator in mongodb

  const customer = await Customer.findOne({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!customer) {
    return next(new ApiError("Reset code invalid or expired"));
  }

  // 2) Reset code valid
  customer.passwordResetVerified = true;
  await customer.save();

  res.status(200).json({
    status: "Success",
  });
});
// @desc rest password
// @route POST /api/auth/restpassword
// @access Public

exports.resetpassword = asyncHandler(async (req, res, next) => {
  // 1) Get user based on email
  const customer = await Customer.findOne({ email: req.body.email });
  if (!customer) {
    return next(
      new ApiError(`There is no customer with email ${req.body.email}`, 404)
    );
  }

  // 2) Check if reset code verified
  if (!customer.passwordResetVerified) {
    return next(new ApiError("Reset code not verified", 400));
  }

  customer.password = req.body.newPassword;
  customer.passwordResetCode = undefined;
  customer.passwordResetExpires = undefined;
  customer.passwordResetVerified = undefined;

  await customer.save();

  // 3) if everything is ok, generate token
  const token = createToken(customer._id);
  res.status(200).json({ token });
});

// check if user is active
exports.protcetactive = asyncHandler(async (req, res, next) => {
  // chec if user is already active
  if (!req.customer.active) {
    return next(new ApiError("Your account is not active", 401));
  }
  next();
});
