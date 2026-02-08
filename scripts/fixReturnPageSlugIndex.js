// إصلاح خطأ E11000 duplicate key على returnPageSlug
// للتشغيل على قاعدة "test": MONGO_DB_NAME=test node scripts/fixReturnPageSlugIndex.js
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

(async () => {
  try {
    let uri = process.env.DATABASE_URL;
    if (!uri) {
      console.error("❌ DATABASE_URL غير موجود في .env");
      process.exit(1);
    }
    const dbNameOverride = process.env.MONGO_DB_NAME;
    if (dbNameOverride) {
      uri = uri.replace(/\/([^/?]+)(\?|$)/, "/" + dbNameOverride + "$2");
      console.log("Using database (from MONGO_DB_NAME):", dbNameOverride);
    }
    console.log("Connecting to DB...");
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const connectedDbName = db.databaseName;
    console.log("Connected to database:", connectedDbName);
    const collection = db.collection("customers");

    // عرض الفهارس الحالية
    const indexes = await collection.indexes();
    console.log("Current indexes:", indexes.map((i) => i.name));

    // حذف الفهرس القديم (غير sparse)
    for (const indexName of ["returnPageSlug_1", "replacementPageSlug_1"]) {
      try {
        await collection.dropIndex(indexName);
        console.log("✅ Dropped index:", indexName);
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        const code = err.code || err.codeName;
        if (code === 27 || code === 85 || code === "IndexNotFound" || msg.includes("index not found") || msg.includes("no such index")) {
          console.log("ℹ️ Index not found, skipping:", indexName);
        } else {
          throw err;
        }
      }
    }

    // إنشاء فهارس sparse يدوياً (تسمح بعدة null)
    await collection.createIndex(
      { returnPageSlug: 1 },
      { unique: true, sparse: true, name: "returnPageSlug_1" }
    );
    console.log("✅ Created sparse unique index: returnPageSlug_1");

    await collection.createIndex(
      { replacementPageSlug: 1 },
      { unique: true, sparse: true, name: "replacementPageSlug_1" }
    );
    console.log("✅ Created sparse unique index: replacementPageSlug_1");

    const after = await collection.indexes();
    console.log("Indexes after fix:", after.map((i) => ({ name: i.name, key: i.key, unique: i.unique, sparse: i.sparse })));
    console.log("\n✅ Done. Try registering again.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err);
    process.exit(1);
  }
})();
