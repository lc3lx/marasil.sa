const slugify = require("slugify");
const bcrypt = require("bcryptjs");
const { check, body } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatormiddelware");
const User = require("../../models/customerModel");

exports.createCustomerValidator = [
  check("firstName")
    .notEmpty()
    .withMessage("firstName is required")
    .isLength({ min: 3 })
    .withMessage("Too short first name")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("lastName")
    .notEmpty()
    .withMessage("lastName is required")
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
          throw new Error("Invalid email addresss");
        }
      })
    ),

  check("password")
    .notEmpty()
    .withMessage("Password required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 8 characters")
    .custom((password, { req }) => {
      if (password !== req.body.confirmPassword) {
        throw new Error("Password Confirmation incorrect");
      }
      return true;
    })
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/g) // pass match one digit and upper case and lower case and the at last 8 tall
    .withMessage(
      "password must be at least one lowercase and uppercae letter and one digit"
    ),

  check("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation required"),

  check("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Invalid phone number")
    .custom((value) =>
      User.findOne({ phone: value }).then((usr) => {
        if (usr) {
          return Promise.reject(new Error("Phone number already exist"));
        }
      })
    ),

  check("profileImage").optional(),
  check("role").optional(),

  validatorMiddleware,
];

exports.getCustomerValidator = [
  check("id").isMongoId().withMessage("Invalid User id format"),
  validatorMiddleware,
];

exports.updateCustomerValidator = [
  check("id").isMongoId().withMessage("Invalid User id format"),
  check("role").optional(),

  validatorMiddleware,
];

exports.changeCustomerPasswordValidator = [
  check("id").isMongoId().withMessage("Invalid User id format"),
  body("currentPassword")
    .notEmpty()
    .withMessage("You must enter your current password"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("You must enter the password confirm"),
  body("password")
    .notEmpty()
    .withMessage("You must enter new password")
    .custom(async (val, { req }) => {
      // 1) Verify current password
      const user = await User.findById(req.params.id);
      if (!user) {
        throw new Error("There is no user for this id");
      }
      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!isCorrectPassword) {
        throw new Error("Incorrect current password");
      }

      // 2) Verify password confirm
      if (val !== req.body.confirmPassword) {
        throw new Error("Password Confirmation incorrect");
      }
      return true;
    })
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/g) // pass match one digit and upper case and lower case and the at last 8 tall
    .withMessage(
      "password must be at least one lowercase and uppercae letter and one digit"
    ),

  validatorMiddleware,
];

exports.deleteCustomerValidator = [
  check("id")
    .isMongoId()
    .withMessage("Invalid User id format")
    .custom((Val, { req }) => {
      return User.findById(Val).then((user) => {
        if (user.role === "admin") {
          throw new Error("you can't delete an admin user");
        }
        return true;
      });
    }),

  validatorMiddleware,
];

exports.changeLoggedCustomerPasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("You must enter your current password"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("You must enter the password confirm"),
  body("password")
    .notEmpty()
    .withMessage("You must enter new password")
    .custom(async (val, { req }) => {
      // 1) Verify current password
      const user = await User.findById(req.customer._id);
      if (!user) {
        throw new Error("There is no user for this id");
      }
      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!isCorrectPassword) {
        throw new Error("Incorrect current password");
      }

      // 2) Verify password confirm
      if (val !== req.body.confirmPassword) {
        throw new Error("Password Confirmation incorrect");
      }
      return true;
    })
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/g) // pass match one digit and upper case and lower case and the at last 8 tall
    .withMessage(
      "password must be 8 digit  at least one lowercase and uppercae letter and one digit"
    ),

  validatorMiddleware,
];
exports.updateLoggedCustomerdataValidator = [
  body("firstName")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  body("lastName")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("E-mail already exist"));
        }
      })
    ),
  check("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
  check("profileImage").optional(),

  validatorMiddleware,
];
