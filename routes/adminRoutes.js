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
  getMe,
  updateLoggedCustomerPassword,
  updateLoggedCustomerdata,
  updateNotificationPreferences,
  updateSecuritySettings,
  updateTrackingSettings,
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

//router.use(auth.protcetactive); // apply protect active for all routes

// Customers routes
router.get("/getMe", getMe);
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
router.put(
  "/updateNotificationPreferences",
  updateNotificationPreferences
);
router.put(
  "/updateSecuritySettings",
  updateSecuritySettings
);
router.put(
  "/updateTrackingSettings",
  updateTrackingSettings
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
