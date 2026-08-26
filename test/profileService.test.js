const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const profileService = require('../src/services/profileService');
const { DEFAULT_PROFILE } = require('../src/data/defaultProfile');

function cleanup() {
  try {
    fs.unlinkSync(profileService.STORE_PATH);
  } catch {
    // already clean
  }
}

beforeEach(cleanup);
afterEach(cleanup);

test('getProfile returns the documented defaults when nothing has been saved', () => {
  const profile = profileService.getProfile();
  assert.equal(profile.travelers, 2);
  assert.equal(profile.homeZip, '55449');
  assert.equal(profile.airport, 'MSP');
  assert.deepEqual(profile.budget.preferred, { min: 1000, max: 2000 });
  assert.equal(profile.budget.stretch.max, 3500);
  assert.equal(profile.budget.absoluteMax, 5000);
  assert.equal(profile.travelTime.preferred, 5);
  assert.equal(profile.travelTime.stretch.max, 8);
  assert.equal(profile.travelTime.absoluteMax, 12);
  assert.equal(profile.tripLength.preferred, 3);
  assert.equal(profile.flight.outboundDay, 'Thursday');
  assert.equal(profile.flight.returnDay, 'Sunday');
});

test('updateProfile persists only the delta and merges over defaults on read', () => {
  profileService.updateProfile({ budget: { preferred: { max: 2200 } } });
  const profile = profileService.getProfile();
  assert.equal(profile.budget.preferred.max, 2200);
  // Untouched sibling fields keep their default values.
  assert.equal(profile.budget.preferred.min, 1000);
  assert.equal(profile.budget.absoluteMax, 5000);
});

test('updateProfile rejects an inconsistent budget (preferred.min > preferred.max)', () => {
  assert.throws(() => profileService.updateProfile({ budget: { preferred: { min: 9000 } } }));
});

test('updateProfile rejects a stretch max below travelTime.preferred', () => {
  assert.throws(() => profileService.updateProfile({ travelTime: { preferred: 10, stretch: { max: 8 } } }));
});

test('resetProfile clears stored overrides back to defaults', () => {
  profileService.updateProfile({ travelers: 4 });
  assert.equal(profileService.getProfile().travelers, 4);
  const reset = profileService.resetProfile();
  assert.equal(reset.travelers, DEFAULT_PROFILE.travelers);
});
