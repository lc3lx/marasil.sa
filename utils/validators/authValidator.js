const slugify = require("slugify");
const { check } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatormiddelware");
const User = require("../../models/customerModel");

// رسائل موحدة للتحقق — تُرجع للعميل مع توضيح السبب
exports.SignUpValidator = [
  check("firstName")
    .notEmpty()
    .withMessage("الاسم الأول مطلوب.")
    .isLength({ min: 3 })
    .withMessage("الاسم الأول يجب أن يكون 3 أحرف على الأقل.")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("lastName")
    .notEmpty()
    .withMessage("الاسم الأخير مطلوب.")
    .isLength({ min: 3 })
    .withMessage("الاسم الأخير يجب أن يكون 3 أحرف على الأقل.")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("email")
    .notEmpty()
    .withMessage("البريد الإلكتروني مطلوب.")
    .isEmail()
    .withMessage("صيغة البريد الإلكتروني غير صحيحة.")
    .custom((val) =>
      User.findOne({ email: val.toLowerCase() }).then((user) => {
        if (user) {
          throw new Error("البريد الإلكتروني مسجل مسبقاً. استخدم بريداً آخر أو سجّل الدخول.");
        }
      })
    ),

  check("password")
    .notEmpty()
    .withMessage("كلمة المرور مطلوبة.")
    .isLength({ min: 6 })
    .withMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل.")
    .custom((password, { req }) => {
      if (password !== req.body.confirmPassword) {
        throw new Error("تأكيد كلمة المرور غير مطابق.");
      }
      return true;
    })
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/g)
    .withMessage(
      "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم واحد على الأقل و8 أحرف كحد أدنى."
    ),

  check("confirmPassword")
    .notEmpty()
    .withMessage("تأكيد كلمة المرور مطلوب."),

  validatorMiddleware,
];

exports.LogInValidator = [
  check("email")
    .notEmpty()
    .withMessage("البريد الإلكتروني مطلوب.")
    .isEmail()
    .withMessage("صيغة البريد الإلكتروني غير صحيحة."),

  check("password")
    .notEmpty()
    .withMessage("كلمة المرور مطلوبة."),

  validatorMiddleware,
];
