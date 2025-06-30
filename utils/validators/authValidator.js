const slugify = require("slugify");
const { check } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatormiddelware");
const User = require("../../models/customerModel");

exports.SignUpValidator = [
  check("firstName")
    .notEmpty()
    .withMessage("firstName is  required")
    .isLength({ min: 3 })
    .withMessage("Too short first name")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("lastName")
    .notEmpty()
    .withMessage("lastName is  required")
    .isLength({ min: 3 })
    .withMessage("Too short last name")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("email")
    .notEmpty()
    .withMessage("Email required")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) {
          throw new Error("email addresss is exists");
        }
      })
    ),

  check("password")
    .notEmpty()
    .withMessage("Password required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .custom((password, { req }) => {
      if (password !== req.body.confirmPassword) {
        throw new Error("Password Confirmation inncorrect");
      }
      return true;
    })
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/g) // pass match one digit and upper case and lower case and the at last 8 tall
    .withMessage(
      "password must be at least one lowercase and uppercae letter and one digit  and 8 characters long"
    ),

  check("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation required"),

  validatorMiddleware,
];
exports.LogInValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email required")
    .isEmail()
    .withMessage("Invalid email address"),

  check("password").notEmpty().withMessage("Password required"),

  validatorMiddleware,
];
