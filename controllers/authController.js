const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ApiError = require("../utils/apiError");
const sendmail = require("../utils/SendMail");
const Customer = require("../models/customerModel");
const createToken = require("../utils/createToken");
const { sanitizeUser } = require("../utils/sanitizeData");

// @desc    Signup
// @route   GET /api/auth/signup
// @access  Public
exports.SignUp = asyncHandler(async (req, res, next) => {
  // 1- Create user
  const customer = await Customer.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
  });

  // 2- Generate token
  const token = createToken(customer._id);

  res.status(201).json({ data: sanitizeUser(customer), token });
});

// @desc    Login
// @route   GET /api/auth/login
// @access  Public
exports.LogIn = asyncHandler(async (req, res, next) => {
  // 2) check if user exist & check if password is correct
  const customer = await Customer.findOne({ email: req.body.email });

  if (
    !customer ||
    !(await bcrypt.compare(req.body.password, customer.password))
  ) {
    return next(new ApiError("Incorrect email or password", 401));
  }
  // 3) generate token
  const token = createToken(customer._id);

  // Delete password from response
  delete customer._doc.password;

  // 4) send response to client side
  res.status(200).json({ data: sanitizeUser(customer), token });
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
