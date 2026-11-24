const constants = require('./constants');
const { formatDate, formatDateTime } = require('./dateTime');

function fail(kind, code, message) {
  return { ok: false, kind: kind, code: code, message: message };
}

// Checks a requested appointment time such as "2026-12-01 09:30".
function validateSlot(input, now) {
  if (now === undefined) {
    now = new Date();
  }

  if (typeof input !== 'string') {
    return fail('format', 'INVALID_DATETIME', 'appointment_datetime is required, e.g. "2026-12-01 09:30"');
  }

  const text = input.trim();
  const pattern = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;
  if (!pattern.test(text)) {
    return fail('format', 'INVALID_DATETIME', 'appointment_datetime must look like "YYYY-MM-DD HH:mm"');
  }

  const parts = text.split(/[- :T]/);
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const hour = Number(parts[3]);
  const minute = Number(parts[4]);
  let second = 0;
  if (parts[5]) {
    second = Number(parts[5]);
  }

  const date = new Date(year, month - 1, day, hour, minute, second);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day ||
      date.getHours() !== hour || date.getMinutes() !== minute || date.getSeconds() !== second) {
    return fail('format', 'INVALID_DATETIME', 'appointment_datetime is not a real date/time');
  }

  if (second !== 0 || minute % constants.SLOT_MINUTES !== 0) {
    return fail('rule', 'NOT_ON_SLOT_BOUNDARY', 'Appointments must start on :00 or :30');
  }

  // a 30 minute slot must END by 17:00, so the last start time is 16:30
  const minutesOfDay = hour * 60 + minute;
  const opening = constants.OPEN_HOUR * 60;
  const lastStart = constants.CLOSE_HOUR * 60 - constants.SLOT_MINUTES;
  if (minutesOfDay < opening || minutesOfDay > lastStart) {
    return fail('rule', 'OUTSIDE_WORKING_HOURS', 'Appointments are between 09:00 and 17:00 (last slot starts at 16:30)');
  }

  if (date.getTime() <= now.getTime()) {
    return fail('rule', 'NOT_IN_FUTURE', 'Appointments can only be booked in the future');
  }

  return { ok: true, dbValue: formatDateTime(date), day: formatDate(date) };
}

module.exports = { validateSlot };