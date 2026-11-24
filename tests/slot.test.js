const { validateSlot } = require('../src/utils/slot');

// We pretend "now" is 1 July 2026 at 08:00, so the tests give the same result on any day
const now = new Date(2026, 6, 1, 8, 0, 0);

test('a future slot on a 30-minute boundary is valid', () => {
  const result = validateSlot('2026-08-10 09:00', now);
  expect(result.ok).toBe(true);
  expect(result.dbValue).toBe('2026-08-10 09:00:00');
  expect(result.day).toBe('2026-08-10');
});

test('16:30 is valid (last slot of the day)', () => {
  expect(validateSlot('2026-08-10 16:30', now).ok).toBe(true);
});

test('17:00 exactly is rejected (the slot would end after closing)', () => {
  const result = validateSlot('2026-08-10 17:00', now);
  expect(result.ok).toBe(false);
  expect(result.code).toBe('OUTSIDE_WORKING_HOURS');
});

test('08:30 is rejected (before opening)', () => {
  expect(validateSlot('2026-08-10 08:30', now).code).toBe('OUTSIDE_WORKING_HOURS');
});

test('09:15 is rejected (not on a 30-minute boundary)', () => {
  expect(validateSlot('2026-08-10 09:15', now).code).toBe('NOT_ON_SLOT_BOUNDARY');
});

test('a time in the past is rejected', () => {
  expect(validateSlot('2026-06-30 10:00', now).code).toBe('NOT_IN_FUTURE');
});

test('malformed text is rejected as a format error', () => {
  const result = validateSlot('tomorrow at nine', now);
  expect(result.ok).toBe(false);
  expect(result.kind).toBe('format');
});

test('an impossible date (30 February) is rejected as a format error', () => {
  expect(validateSlot('2027-02-30 10:00', now).kind).toBe('format');
});

test('a missing value is rejected', () => {
  expect(validateSlot(undefined, now).kind).toBe('format');
});
