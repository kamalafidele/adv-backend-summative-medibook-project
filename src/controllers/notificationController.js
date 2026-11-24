// Runs inside the WORKER process. "Sending" the message = writing it to the audit log.
const { audit } = require('../utils/auditLogger');

async function sendConfirmation(data) {
  const message = 'Hello ' + data.patientName + ', your appointment with ' + data.doctorName +
    ' (room ' + data.room + ') on ' + data.apptDatetime + ' is confirmed.';

  const written = await audit('notification_sent', {
    appointmentId: data.appointmentId,
    email: data.patientEmail,
    sms: data.patientPhone,
    message: message,
  });

  if (!written) {
    throw new Error('could not write the notification to the audit log');
  }
}

module.exports = { sendConfirmation };
