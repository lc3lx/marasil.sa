const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");

// Store connection routes
router.post("/connect", storeController.connectStore);
router.get("/", storeController.getStores);
router.delete("/:storeId", storeController.disconnectStore);

module.exports = router;
