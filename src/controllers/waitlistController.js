// Runs inside the WORKER process: a slot was freed, so book the first person on the waitlist.
const waitlist = require('../queue/waitlist');
const appointmentModel = require('../models/Appointment');
const appointmentController = require('./appointmentController');
const { validateSlot } = require('../utils/slot');
const { audit } = require('../utils/auditLogger');


async function promoteFromWaitlist(client, job) {
  const doctorId = job.doctorId;
  const day = job.day;

  const slot = validateSlot(job.slot);
  if (!slot.ok) {
    return 'slot is not bookable any more: ' + slot.code;
  }

  // keep going until somebody is booked or the waitlist is empty
  while (true) {
    const entryText = await waitlist.takeNext(client, doctorId, day);
    if (entryText === null) {
      return 'waitlist is empty';
    }
    const entry = JSON.parse(entryText);

    try {
      // Jobs can be delivered twice. If this patient already has an appointment that day, skip them.
      const alreadyBooked = await appointmentModel.hasBookingOnDay(entry.patientId, doctorId, day);
      if (alreadyBooked) {
        await waitlist.confirmDone(client, doctorId, day, entryText);
        continue;
      }

      const result = await appointmentController.bookSlot(entry.patientId, doctorId, slot, 'waitlist');

      if (!result.error) {
        // booked and saved in MySQL: only NOW is the patient removed from Redis
        await waitlist.confirmDone(client, doctorId, day, entryText);
        await audit('waitlist_promoted', {
          patientId: entry.patientId, doctorId: doctorId, appointmentId: result.appointment.id, trigger: job.reason,
        });
        return 'booked patient ' + entry.patientId;
      }

      if (result.error === 'PATIENT_NOT_FOUND' || result.error === 'DOCTOR_NOT_FOUND') {
        // this person can never be booked: keep them in the "failed" list with the reason
        await waitlist.moveToFailed(client, doctorId, day, entryText, result.error);
        await audit('waitlist_entry_failed', { patientId: entry.patientId, doctorId: doctorId, reason: result.error });
        continue; // try the next person
      }

      await waitlist.putBack(client, doctorId, day, entryText);
      return 'slot not available (' + result.error + '), patient put back in the queue';
    } catch (err) {
      await waitlist.putBack(client, doctorId, day, entryText);
      throw err;
    }
  }
}

module.exports = { promoteFromWaitlist };
