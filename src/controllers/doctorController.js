const doctorModel = require('../models/Doctor');
const { validateDoctor, isValidId } = require('../utils/validators');
const { createError } = require('../utils/errors');
const { formatDate, formatDateTime } = require('../utils/dateTime');
const constants = require('../utils/constants');

async function getAllDoctors(req, res, next) {
  try {
    const doctors = await doctorModel.getAllDoctors();
    res.json(doctors);
  } catch (err) {
    next(err);
  }
}

async function getDoctor(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'doctor id must be a positive whole number');
    }
    const doctor = await doctorModel.getDoctorById(Number(req.params.id));
    if (doctor === null) {
      throw createError(404, 'NOT_FOUND', 'Doctor not found');
    }
    res.json(doctor);
  } catch (err) {
    next(err);
  }
}

async function createDoctor(req, res, next) {
  try {
    const check = validateDoctor(req.body);
    if (check.errors.length > 0) {
      throw createError(400, 'VALIDATION_ERROR', 'Validation failed', check.errors);
    }
    const d = check.data;
    const id = await doctorModel.createDoctor(d.name, d.specialty, d.consultation_fee, d.room);
    const doctor = await doctorModel.getDoctorById(id);
    res.status(201).json(doctor);
  } catch (err) {
    next(err);
  }
}

async function updateDoctor(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'doctor id must be a positive whole number');
    }
    const id = Number(req.params.id);
    const check = validateDoctor(req.body);
    if (check.errors.length > 0) {
      throw createError(400, 'VALIDATION_ERROR', 'Validation failed', check.errors);
    }
    const existing = await doctorModel.getDoctorById(id);
    if (existing === null) {
      throw createError(404, 'NOT_FOUND', 'Doctor not found');
    }
    const d = check.data;
    await doctorModel.updateDoctor(id, d.name, d.specialty, d.consultation_fee, d.room);
    const doctor = await doctorModel.getDoctorById(id);
    res.json(doctor);
  } catch (err) {
    next(err);
  }
}

async function deleteDoctor(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'doctor id must be a positive whole number');
    }
    const deleted = await doctorModel.deleteDoctor(Number(req.params.id));
    if (!deleted) {
      throw createError(404, 'NOT_FOUND', 'Doctor not found');
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /api/doctors/:id/stats
async function getDoctorStats(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'doctor id must be a positive whole number');
    }
    const id = Number(req.params.id);
    const doctor = await doctorModel.getDoctorById(id);
    if (doctor === null) {
      throw createError(404, 'NOT_FOUND', 'Doctor not found');
    }

    const now = new Date();
    const stats = await doctorModel.getDoctorStats(
      id, formatDateTime(now), formatDate(now), constants.DAILY_CAP, constants.STATS_DAYS
    );

    res.json({
      doctor: { id: doctor.id, name: doctor.name, specialty: doctor.specialty },
      revenue_collected: stats.revenue_collected,
      upcoming_appointments: stats.upcoming_appointments,
      daily_cap: constants.DAILY_CAP,
      next_7_days: {
        appointments_per_day: stats.per_day,
        booked_slots: stats.booked_slots,
        utilization_pct: stats.utilization_pct,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor, getDoctorStats };
