const { validatePatient, validateDoctor, validateBooking, isValidId } = require('../src/utils/validators');

test('a valid patient has no errors and the email is cleaned up', () => {
  const result = validatePatient({ name: '  Ama Mensah ', email: 'AMA@Mail.com', phone: '0244-111-222' });
  expect(result.errors).toHaveLength(0);
  expect(result.data.name).toBe('Ama Mensah');
  expect(result.data.email).toBe('ama@mail.com');
});

test('an invalid patient reports every problem', () => {
  const result = validatePatient({ name: 'A', email: 'nope', phone: 'abc' });
  expect(result.errors).toHaveLength(3);
});

test('a doctor with a negative fee is rejected', () => {
  const result = validateDoctor({ name: 'Dr. Adjei', specialty: 'Paediatrics', consultation_fee: -5, room: 'R-03' });
  expect(result.errors).toHaveLength(1);
});

test('a valid doctor passes', () => {
  const result = validateDoctor({ name: 'Dr. Adjei', specialty: 'Paediatrics', consultation_fee: 100, room: 'R-03' });
  expect(result.errors).toHaveLength(0);
});

test('booking needs positive whole number ids', () => {
  expect(validateBooking({ patient_id: 0, doctor_id: 1 }).errors).toHaveLength(1);
  expect(validateBooking({ patient_id: 1, doctor_id: 2 }).errors).toHaveLength(0);
  expect(isValidId('12abc')).toBe(false);
});
