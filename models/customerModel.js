const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    phone: {
      type: String,
    },

    slug: {
      type: String,
      lowercase: true,
    },
    profileImage: String,
    email: {
      type: String,
      required: [true, "email is required"],
      unique: [true, "email is unique"],
      lowercase: true,
    },

    brand_color: {
      type: String,
    },
    brand_logo: {
      type: String,
    },
    company_name_ar: {
      type: String,
    },
    company_name_en: {
      type: String,
    },
    brand_email: {
      type: String,
      // required: true,
    },
    brand_website: {
      type: String,
    },
    commercial_registration_number: {
      type: String,
    },
    tax_number: {
      type: String,
    },

    additional_info: {
      type: String,
    },

    password: {
      type: String,
      minLength: [6, "too short password"],
    },
    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,

    active: {
      type: Boolean,
      default: true,
    },

    role: {
      type: String,
      enum: ["user", "manager", "admin", "superadmin", "employee"],
      default: "user",
    },
    addresses: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        alias: String,
        location: String,
        country: String,
        city: String,
        street: String,
        district: String,
        phone: String,
        postalCode: String,
        detalis: String,
      },
    ],
    // Notification preferences
    notificationPreferences: {
      shipmentUpdates: { type: Boolean, default: true },
      deliveryNotifications: { type: Boolean, default: true },
      delayNotifications: { type: Boolean, default: true },
      paymentNotifications: { type: Boolean, default: true },
      securityNotifications: { type: Boolean, default: true },
      marketingNotifications: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },
    // Security settings
    securitySettings: {
      twoFactorEnabled: { type: Boolean, default: false },
    },
    // Tracking page customization settings
    trackingSettings: {
      companyName: { type: String, default: "" },
      logo: { type: String, default: "/wtshn.jpg" },
      primaryColor: { type: String, default: "#3498db" },
      secondaryColor: { type: String, default: "#f8f9fa" },
      showHeader: { type: Boolean, default: true },
      showFooter: { type: Boolean, default: true },
      showMap: { type: Boolean, default: true },
      showTimeline: { type: Boolean, default: true },
      language: { type: String, default: "ar" },
      customCss: { type: String, default: "" },
      customJs: { type: String, default: "" },
      embedCode: { type: String, default: "<div id='shipexpress-tracking' data-tracking-id='YOUR_TRACKING_ID'></div><script src='https://tracking.shipexpress.com/embed.js'></script>" },
    },
  },
  { timestamps: true }
);
customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ملاحظة: تم إزالة SetImageUrl hooks لأن المسارات تُضاف في الـ Controller
// هذا يمنع تكرار المسارات ويعطي تحكم أفضل

const customer = mongoose.model("Customer", customerSchema);

module.exports = customer;
