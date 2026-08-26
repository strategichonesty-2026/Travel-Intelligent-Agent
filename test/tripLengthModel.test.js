const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyTripLength, TRIP_LENGTH_STATUS } = require('../src/domain/tripLengthModel');

const TRIP_LENGTH = { preferred: 3, stretch: { min: 2, max: 4 }, max: 5 };

test('classifyTripLength returns UNVERIFIED for unknown nights', () => {
  assert.equal(classifyTripLength(null, TRIP_LENGTH).status, TRIP_LENGTH_STATUS.UNVERIFIED);
});

test('classifyTripLength: exact preferred nights is PREFERRED', () => {
  assert.equal(classifyTripLength(3, TRIP_LENGTH).status, TRIP_LENGTH_STATUS.PREFERRED);
});

test('classifyTripLength: within stretch range but not preferred is STRETCH', () => {
  assert.equal(classifyTripLength(4, TRIP_LENGTH).status, TRIP_LENGTH_STATUS.STRETCH);
  assert.equal(classifyTripLength(2, TRIP_LENGTH).status, TRIP_LENGTH_STATUS.STRETCH);
});

test('classifyTripLength: between stretch.max and max is MAX', () => {
  assert.equal(classifyTripLength(5, TRIP_LENGTH).status, TRIP_LENGTH_STATUS.MAX);
});

test('classifyTripLength: beyond max is EXCLUDED', () => {
  assert.equal(classifyTripLength(6, TRIP_LENGTH).status, TRIP_LENGTH_STATUS.EXCLUDED);
});
