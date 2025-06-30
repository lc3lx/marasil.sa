const express = require("express");

const {
  createCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  changeCustomerPassword,
  UploadCustomerImage,
  ResizeImage,
  getLoggedCustomerData,
  updateLoggedCustomerPassword,
  updateLoggedCustomerdata,
} = require("../controllers/adminController");
const {
  createCustomerValidator,
  getCustomerValidator,
  updateCustomerValidator,
  deleteCustomerValidator,
  changeCustomerPasswordValidator,
  changeLoggedCustomerPasswordValidator,
  updateLoggedCustomerdataValidator,
} = require("../utils/validators/customerValidator");

const auth = require("../controllers/authController");

const router = express.Router();

router.use(auth.Protect); // apply protect  for all routes (admin and users)

router.use(auth.protcetactive); // apply protect active for all routes

// Customers routes
router.get("/getMe", getLoggedCustomerData, getCustomer);
router.put(
  "/changeMyPassword",
  changeLoggedCustomerPasswordValidator,
  updateLoggedCustomerPassword
);
router.put(
  "/updateMe",
  updateLoggedCustomerdataValidator,
  UploadCustomerImage,
  ResizeImage,
  updateLoggedCustomerdata
);

// Admin routes
router.use(auth.allowedTo("admin")); // apply  authroiztion for all admin  routes
// router.put(
//   "/chandgePassword/:id",
//   changeCustomerPasswordValidator,
//   changeCustomerPassword
// );

router
  .route("/")
  .post(
    createCustomerValidator,
    UploadCustomerImage,
    ResizeImage,
    createCustomer
  )
  .get(getCustomers);
router
  .route("/:id")
  .get(getCustomerValidator, getCustomer)
  .put(updateCustomerValidator, updateCustomer)
  .delete(deleteCustomerValidator, deleteCustomer);
module.exports = router;
