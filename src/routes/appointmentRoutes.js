const express = require('express');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', appointmentController.bookAppointment);
router.get('/:id', appointmentController.getAppointment);
router.post('/:id/cancellation', appointmentController.cancelAppointment);

module.exports = router;
