// scripts/updateIndexes.js
const mongoose = require("mongoose");
require("dotenv").config();

(async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    const db = mongoose.connection.db;

    // حذف الفهرس القديم
    try {
      await db.collection("orders").dropIndex("id_1_storeId_1");
      console.log("✅ Old index dropped");
    } catch (err) {
      if (err.codeName === "IndexNotFound") {
        console.log("ℹ️ Old index not found, skipping drop...");
      } else {
        throw err;
      }
    }

    // إنشاء الفهرس الجزئي الجديد
    await db.collection("orders").createIndex(
      { id: 1, storeId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          id: { $type: "number" },
          storeId: { $type: "string" }, // ✅ هذا هو التعديل المهم
        },
      }
    );

    console.log("✅ Partial unique index created successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to update index:", err);
    process.exit(1);
  }
})();
