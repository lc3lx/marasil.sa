const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

router.get('/', salaryController.getSalaries);
router.put("/:id",salaryController.updateStatusTopaid)

module.exports = router;