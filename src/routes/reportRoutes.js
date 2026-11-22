const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/doctors', reportController.getDoctorsReport);
router.get('/busy-days', reportController.getBusyDays);

module.exports = router;
