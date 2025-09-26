const mongoose = require("mongoose");
const Customer = require("./models/customerModel");

mongoose
  .connect("mongodb://localhost:27017/marasil", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    const customer = await Customer.findById("689e81d43d1269685093e62f");
    console.log("Customer data:");
    console.log("profileImage:", customer.profileImage);
    console.log("brand_logo:", customer.brand_logo);
    console.log("All fields:", Object.keys(customer.toObject()));

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
