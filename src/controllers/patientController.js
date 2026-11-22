const patientModel = require('../models/Patient');
const { validatePatient, isValidId } = require('../utils/validators');
const { createError } = require('../utils/errors');

async function getAllPatients(req, res, next) {
  try {
    const patients = await patientModel.getAllPatients();
    res.json(patients);
  } catch (err) {
    next(err);
  }
}

async function getPatient(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'patient id must be a positive whole number');
    }
    const patient = await patientModel.getPatientById(Number(req.params.id));
    if (patient === null) {
      throw createError(404, 'NOT_FOUND', 'Patient not found');
    }
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

async function createPatient(req, res, next) {
  try {
    const check = validatePatient(req.body);
    if (check.errors.length > 0) {
      throw createError(400, 'VALIDATION_ERROR', 'Validation failed', check.errors);
    }
    const id = await patientModel.createPatient(check.data.name, check.data.email, check.data.phone);
    const patient = await patientModel.getPatientById(id);
    res.status(201).json(patient);
  } catch (err) {
    next(err);
  }
}

async function updatePatient(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'patient id must be a positive whole number');
    }
    const id = Number(req.params.id);
    const check = validatePatient(req.body);
    if (check.errors.length > 0) {
      throw createError(400, 'VALIDATION_ERROR', 'Validation failed', check.errors);
    }
    const existing = await patientModel.getPatientById(id);
    if (existing === null) {
      throw createError(404, 'NOT_FOUND', 'Patient not found');
    }
    await patientModel.updatePatient(id, check.data.name, check.data.email, check.data.phone);
    const patient = await patientModel.getPatientById(id);
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

async function deletePatient(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'patient id must be a positive whole number');
    }
    const deleted = await patientModel.deletePatient(Number(req.params.id));
    if (!deleted) {
      throw createError(404, 'NOT_FOUND', 'Patient not found');
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllPatients, getPatient, createPatient, updatePatient, deletePatient };
