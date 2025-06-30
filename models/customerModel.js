const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String },
    lastName: { type: String },

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
    phone: {
      type: String,
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
  },
  { timestamps: true }
);
customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const SetImageUrl = (doc) => {
  if (doc.profileImage) {
    doc.profileImage = `${process.env.BASE_URL}/customers/${doc.profileImage}`;
  }
  if (doc.brand_logo) {
    doc.brand_logo = `${process.env.BASE_URL}/Logo/${doc.brand_logo}`;
  }
};

customerSchema.post("init", function (doc) {
  SetImageUrl(doc);
});

customerSchema.post("save", (doc) => {
  SetImageUrl(doc);
});

const customer = mongoose.model("Customer", customerSchema);

module.exports = customer;
