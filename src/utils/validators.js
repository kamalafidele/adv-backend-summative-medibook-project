// Input validation. Each function returns { errors: [...], data: {...} }.
// If "errors" is empty the input is fine and "data" holds the cleaned values.

function isValidId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

function validatePatient(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { errors: ['Request body must be a JSON object'], data: {} };
  }

  let name = '';
  if (typeof body.name === 'string') {
    name = body.name.trim();
  }
  if (name.length < 2 || name.length > 100) {
    errors.push('name is required (2-100 characters)');
  }

  let email = '';
  if (typeof body.email === 'string') {
    email = body.email.trim().toLowerCase();
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email) || email.length > 150) {
    errors.push('email must be a valid email address');
  }

  let phone = '';
  if (typeof body.phone === 'string') {
    phone = body.phone.trim();
  }
  const phonePattern = /^[0-9+()\- ]{7,20}$/;
  if (!phonePattern.test(phone)) {
    errors.push('phone must be 7-20 characters (digits, spaces, +, -, brackets)');
  }

  return { errors: errors, data: { name: name, email: email, phone: phone } };
}

function validateDoctor(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { errors: ['Request body must be a JSON object'], data: {} };
  }

  let name = '';
  if (typeof body.name === 'string') {
    name = body.name.trim();
  }
  if (name.length < 2 || name.length > 100) {
    errors.push('name is required (2-100 characters)');
  }

  let specialty = '';
  if (typeof body.specialty === 'string') {
    specialty = body.specialty.trim();
  }
  if (specialty.length < 2 || specialty.length > 80) {
    errors.push('specialty is required (2-80 characters)');
  }

  const fee = Number(body.consultation_fee);
  if (body.consultation_fee === undefined || body.consultation_fee === '' || Number.isNaN(fee) || fee < 0 || fee > 99999.99) {
    errors.push('consultation_fee must be a number between 0 and 99999.99');
  } else if (Math.round(fee * 100) / 100 !== fee) {
    errors.push('consultation_fee can have at most 2 decimal places');
  }

  let room = '';
  if (typeof body.room === 'string') {
    room = body.room.trim();
  }
  if (room.length < 1 || room.length > 10) {
    errors.push('room is required (1-10 characters)');
  }

  return { errors: errors, data: { name: name, specialty: specialty, consultation_fee: fee, room: room } };
}

function validateBooking(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { errors: ['Request body must be a JSON object'], data: {} };
  }

  if (!isValidId(body.patient_id)) {
    errors.push('patient_id must be a positive whole number');
  }
  if (!isValidId(body.doctor_id)) {
    errors.push('doctor_id must be a positive whole number');
  }
  if (body.join_waitlist !== undefined && typeof body.join_waitlist !== 'boolean') {
    errors.push('join_waitlist must be true or false');
  }

  const data = {
    patientId: Number(body.patient_id),
    doctorId: Number(body.doctor_id),
    joinWaitlist: body.join_waitlist === true,
    appointmentDatetime: body.appointment_datetime,
  };
  return { errors: errors, data: data };
}

module.exports = { isValidId, validatePatient, validateDoctor, validateBooking };