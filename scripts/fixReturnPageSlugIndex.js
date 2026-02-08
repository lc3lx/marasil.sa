// إصلاح خطأ E11000 duplicate key على returnPageSlug
// السبب: وجود فهرس unique قديم غير sparse يمنع أكثر من مستند من أن يكون returnPageSlug: null
const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const Customer = require("../models/customerModel");

(async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    const db = mongoose.connection.db;
    const collection = db.collection("customers");

    for (const indexName of ["returnPageSlug_1", "replacementPageSlug_1"]) {
      try {
        await collection.dropIndex(indexName);
        console.log("✅ Dropped index:", indexName);
      } catch (err) {
        if (err.code === 27 || err.codeName === "IndexNotFound") {
          console.log("ℹ️ Index not found, skipping:", indexName);
        } else {
          throw err;
        }
      }
    }

    await Customer.syncIndexes();
    console.log("✅ Customer indexes synced (sparse unique on returnPageSlug/replacementPageSlug)");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
})();
