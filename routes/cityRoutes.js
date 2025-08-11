const express = require('express');
const router = express.Router();
const citysController = require('../controllers/citysController');

// بحث عن مدينة بالاسم وإرجاع اسم المدينة واسم المنطقة
router.get('/search', citysController.searchCity);

module.exports = router;
