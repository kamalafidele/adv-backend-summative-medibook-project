const { calculateRefund } = require('../src/utils/refund');

// The appointment is on 10 Dec 2026 at 10:00. Helper: cancel X hours before it.
const HOUR = 1000 * 60 * 60;
const appointment = new Date(2026, 11, 10, 10, 0, 0);

function refundWithNotice(hours, amountPaid) {
  const cancelTime = new Date(appointment.getTime() - hours * HOUR);
  return calculateRefund(amountPaid, appointment, cancelTime);
}

test('more than 48 hours notice gives a 100% refund', () => {
  const result = refundWithNotice(72, 150);
  expect(result.percent).toBe(100);
  expect(result.refundAmount).toBe(150);
});

test('between 24 and 48 hours notice gives a 50% refund', () => {
  const result = refundWithNotice(36, 150);
  expect(result.percent).toBe(50);
  expect(result.refundAmount).toBe(75);
});

test('less than 24 hours notice gives no refund', () => {
  const result = refundWithNotice(5, 150);
  expect(result.percent).toBe(0);
  expect(result.refundAmount).toBe(0);
});

test('boundary: exactly 48 hours is NOT "more than 48", so 50%', () => {
  expect(refundWithNotice(48, 100).percent).toBe(50);
});

test('boundary: one millisecond more than 48 hours is 100%', () => {
  const cancelTime = new Date(appointment.getTime() - 48 * HOUR - 1);
  expect(calculateRefund(100, appointment, cancelTime).percent).toBe(100);
});

test('boundary: exactly 24 hours is still 50%', () => {
  expect(refundWithNotice(24, 100).percent).toBe(50);
});

test('boundary: one millisecond less than 24 hours is 0%', () => {
  const cancelTime = new Date(appointment.getTime() - 24 * HOUR + 1);
  expect(calculateRefund(100, appointment, cancelTime).percent).toBe(0);
});

test('refund amount is rounded to cents', () => {
  expect(refundWithNotice(30, 33.33).refundAmount).toBe(16.67);
});
