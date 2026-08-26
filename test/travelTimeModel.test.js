const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyTravelTime, TRAVEL_TIME_STATUS } = require('../src/domain/travelTimeModel');

// Exact worked example from the spec: preferred=5h, stretch=8h, absoluteMax=12h.
const TRAVEL_TIME = { preferred: 5, stretch: { enabled: true, max: 8 }, absoluteMax: 12 };

test('classifyTravelTime returns UNVERIFIED for unknown travel time', () => {
  assert.equal(classifyTravelTime(null, TRAVEL_TIME).status, TRAVEL_TIME_STATUS.UNVERIFIED);
});

test('classifyTravelTime: within preferred is PREFERRED', () => {
  assert.equal(classifyTravelTime(5, TRAVEL_TIME).status, TRAVEL_TIME_STATUS.PREFERRED);
  assert.equal(classifyTravelTime(3, TRAVEL_TIME).status, TRAVEL_TIME_STATUS.PREFERRED);
});

test('classifyTravelTime: spec example — 6 hours is STRETCH_TRAVEL_TIME', () => {
  assert.equal(classifyTravelTime(6, TRAVEL_TIME).status, TRAVEL_TIME_STATUS.STRETCH_TRAVEL_TIME);
});

test('classifyTravelTime: spec example — 10 hours is LONG_TRAVEL_TIME', () => {
  assert.equal(classifyTravelTime(10, TRAVEL_TIME).status, TRAVEL_TIME_STATUS.LONG_TRAVEL_TIME);
});

test('classifyTravelTime: spec example — 13 hours is EXCLUDED', () => {
  assert.equal(classifyTravelTime(13, TRAVEL_TIME).status, TRAVEL_TIME_STATUS.EXCLUDED);
});

test('classifyTravelTime: stretch disabled skips straight to LONG_TRAVEL_TIME past preferred', () => {
  const noStretch = { preferred: 5, stretch: { enabled: false, max: 8 }, absoluteMax: 12 };
  assert.equal(classifyTravelTime(6, noStretch).status, TRAVEL_TIME_STATUS.LONG_TRAVEL_TIME);
});
