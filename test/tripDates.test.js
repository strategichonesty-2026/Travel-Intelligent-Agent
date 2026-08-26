const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeDefaultTripDates, nextOccurrenceOf } = require('../src/domain/tripDates');

test('nextOccurrenceOf returns the same date when the reference already matches the day', () => {
  // 2026-08-27 is a Thursday.
  const result = nextOccurrenceOf('Thursday', '2026-08-27');
  assert.equal(result.toISOString().slice(0, 10), '2026-08-27');
});

test('nextOccurrenceOf finds the following Thursday from a Sunday', () => {
  // 2026-08-23 is a Sunday -> next Thursday is 2026-08-27.
  const result = nextOccurrenceOf('Thursday', '2026-08-23');
  assert.equal(result.toISOString().slice(0, 10), '2026-08-27');
});

test('computeDefaultTripDates applies the profile pattern (Thursday, 3 nights -> Sunday)', () => {
  const profile = { flight: { outboundDay: 'Thursday' }, tripLength: { preferred: 3 } };
  const { startDate, endDate, nights } = computeDefaultTripDates(profile, '2026-08-23');
  assert.equal(startDate, '2026-08-27');
  assert.equal(endDate, '2026-08-30');
  assert.equal(nights, 3);
});
