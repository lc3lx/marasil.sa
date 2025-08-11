const { check } = require("express-validator");
const validatormiddelware = require("../../middlewares/validatormiddelware");
const Package = require("../../models/packageModel");

exports.updatePackagealidator = [
  check("id")
    .isMongoId()
    .withMessage("Invalid Package id format")

    .custom((val, { req }) => {
      if (req.customer.role === "user") {
        return Package.findById(val).then((package) => {
          if (!package) {
            return Promise.reject(new Error(` ther is no package ${val}`));
          }

          if (package.customer._id.toString() !== req.customer._id.toString()) {
            return Promise.reject(
              new Error(`Your are not allowed to perform this action`)
            );
          }
        });
      } else if (
        req.customer.role === "manager" ||
        req.customer.role === "admin"
      ) {
        return true;
      }else{
        return Promise.reject(
          new Error(`Your are not allowed to perform this action`)
        );
      }
    }),
  check("title").optional(),
  check("dimensions").optional(),
  validatormiddelware,
];
