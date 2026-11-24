const appointmentModel = require('../models/Appointment');
const waitlist = require('../queue/waitlist');
const jobQueue = require('../queue/jobQueue');
const { audit } = require('../utils/auditLogger');
const { validateSlot } = require('../utils/slot');
const { calculateRefund } = require('../utils/refund');
const { validateBooking, isValidId } = require('../utils/validators');
const { formatDateTime, parseDateTime } = require('../utils/dateTime');
const { createError } = require('../utils/errors');
const constants = require('../utils/constants');

// Books the slot, writes the audit log and queues the confirmation message.
async function bookSlot(patientId, doctorId, slot, source) {
  const result = await appointmentModel.bookAppointment(patientId, doctorId, slot.dbValue, slot.day, constants.DAILY_CAP);
  if (result.error) {
    return { error: result.error };
  }

  const appointment = await appointmentModel.getAppointmentById(result.id);

  await audit('appointment_booked', {
    appointmentId: appointment.id,
    patientId: patientId,
    doctorId: doctorId,
    appointmentDatetime: appointment.appt_datetime,
    amountPaid: appointment.amount_paid,
    source: source,
  });

  // The booking is already saved. If Redis is down we only log it - we do NOT fail the booking.
  try {
    await jobQueue.addJob(jobQueue.NOTIFICATION_QUEUE, {
      appointmentId: appointment.id,
      patientName: appointment.patient_name,
      patientEmail: appointment.patient_email,
      patientPhone: appointment.patient_phone,
      doctorName: appointment.doctor_name,
      room: appointment.room,
      apptDatetime: appointment.appt_datetime,
    });
  } catch (err) {
    console.error('Could not queue the confirmation message: ' + err.message);
  }

  return { appointment: appointment };
}

// POST /api/appointments
async function bookAppointment(req, res, next) {
  try {
    const check = validateBooking(req.body);
    if (check.errors.length > 0) {
      throw createError(400, 'VALIDATION_ERROR', 'Validation failed', check.errors);
    }
    const patientId = check.data.patientId;
    const doctorId = check.data.doctorId;

    const slot = validateSlot(check.data.appointmentDatetime);
    if (!slot.ok) {
      if (slot.kind === 'format') {
        throw createError(400, slot.code, slot.message);
      }
      throw createError(422, slot.code, slot.message);
    }

    const result = await bookSlot(patientId, doctorId, slot, 'api');

    if (!result.error) {
      return res.status(201).json(result.appointment);
    }
    if (result.error === 'PATIENT_NOT_FOUND') {
      throw createError(404, 'PATIENT_NOT_FOUND', 'Patient not found');
    }
    if (result.error === 'DOCTOR_NOT_FOUND') {
      throw createError(404, 'DOCTOR_NOT_FOUND', 'Doctor not found');
    }

    // From here the error is SLOT_TAKEN or DAY_FULL: offer the waitlist
    let message = 'This slot is already booked for the doctor';
    if (result.error === 'DAY_FULL') {
      message = 'The doctor already has ' + constants.DAILY_CAP + ' appointments on ' + slot.day;
    }

    if (!check.data.joinWaitlist) {
      throw createError(409, result.error, message, {
        waitlist_available: true,
        hint: 'Send the same request with "join_waitlist": true to join the waitlist',
      });
    }

    let waitlistResult;
    try {
      waitlistResult = await waitlist.addToWaitlist(patientId, doctorId, slot.day, slot.dbValue);
      // Safety check: if the slot was freed a moment ago, let the worker try to use it
      await jobQueue.addJob(jobQueue.PROMOTION_QUEUE, {
        doctorId: doctorId, day: slot.day, slot: slot.dbValue, reason: 'waitlist_join_check',
      });
    } catch (redisError) {
      throw createError(503, 'WAITLIST_UNAVAILABLE', 'The waitlist is not available right now, please try again later');
    }

    await audit('waitlist_joined', {
      patientId: patientId, doctorId: doctorId, day: slot.day, position: waitlistResult.position,
    });

    let waitlistMessage = 'You are already on the waitlist for this doctor and day.';
    if (waitlistResult.added) {
      waitlistMessage = 'No place is free. You were added to the waitlist and will be booked automatically if a place opens up.';
    }
    res.status(202).json({
      message: waitlistMessage,
      waitlist: { doctor_id: doctorId, day: slot.day, position: waitlistResult.position, reason: result.error },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/appointments/:id
async function getAppointment(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'appointment id must be a positive whole number');
    }
    const appointment = await appointmentModel.getAppointmentById(Number(req.params.id));
    if (appointment === null) {
      throw createError(404, 'NOT_FOUND', 'Appointment not found');
    }
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

// POST /api/appointments/:id/cancellation
async function cancelAppointment(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      throw createError(400, 'VALIDATION_ERROR', 'appointment id must be a positive whole number');
    }
    const id = Number(req.params.id);

    const appointment = await appointmentModel.getAppointmentById(id);
    if (appointment === null) {
      throw createError(404, 'NOT_FOUND', 'Appointment not found');
    }
    if (appointment.status === 'cancelled') {
      throw createError(409, 'ALREADY_CANCELLED', 'Appointment is already cancelled');
    }

    // the SERVER decides the refund (the client cannot send an amount)
    const now = new Date();
    const apptDate = parseDateTime(appointment.appt_datetime);
    if (apptDate.getTime() <= now.getTime()) {
      throw createError(422, 'APPOINTMENT_ALREADY_STARTED', 'An appointment that already started cannot be cancelled');
    }
    const refund = calculateRefund(appointment.amount_paid, apptDate, now);

    const outcome = await appointmentModel.cancelAppointment(id, refund.refundAmount, formatDateTime(now));
    if (outcome === 'NOT_FOUND') {
      throw createError(404, 'NOT_FOUND', 'Appointment not found');
    }
    if (outcome === 'ALREADY_CANCELLED') {
      throw createError(409, 'ALREADY_CANCELLED', 'Appointment is already cancelled');
    }

    await audit('appointment_cancelled', {
      appointmentId: id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      appointmentDatetime: appointment.appt_datetime,
      refundAmount: refund.refundAmount,
      refundPercent: refund.percent,
    });

    // Tell the waitlist that a slot is free (the worker does the actual booking)
    try {
      await jobQueue.addJob(jobQueue.PROMOTION_QUEUE, {
        doctorId: appointment.doctor_id,
        day: appointment.appt_datetime.substring(0, 10),
        slot: appointment.appt_datetime,
        reason: 'cancellation',
      });
    } catch (err) {
      console.error('Could not notify the waitlist: ' + err.message);
    }

    const cancelled = await appointmentModel.getAppointmentById(id);
    res.status(201).json({
      message: 'Appointment cancelled',
      appointment: cancelled,
      refund: {
        amount: refund.refundAmount,
        percent: refund.percent,
        hours_notice: Math.round(refund.hours * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { bookSlot, bookAppointment, getAppointment, cancelAppointment };
