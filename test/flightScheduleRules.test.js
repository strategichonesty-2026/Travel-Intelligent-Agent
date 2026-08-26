const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchesOutboundRule, matchesReturnRule, matchesConnectionPreference } = require('../src/domain/flightScheduleRules');
const { DEFAULT_PROFILE } = require('../src/data/defaultProfile');

// DEFAULT_PROFILE.flight: outboundDay Thursday, MSP, after 15:00; returnDay Sunday, MSP, target
// 17:00, window 16:00-18:00.

test('matchesOutboundRule: passes for a Thursday MSP departure after 3pm', () => {
  const leg = { departure: { airportCode: 'MSP', localTime: '2026-08-27T15:45:00' } }; // a real Thursday
  const result = matchesOutboundRule(leg, DEFAULT_PROFILE);
  assert.equal(result.matches, true);
  assert.deepEqual(result.reasons, []);
});

test('matchesOutboundRule: fails for a departure before 3pm', () => {
  const leg = { departure: { airportCode: 'MSP', localTime: '2026-08-27T09:00:00' } };
  const result = matchesOutboundRule(leg, DEFAULT_PROFILE);
  assert.equal(result.matches, false);
  assert.ok(result.reasons.some((r) => r.includes('before 15:00')));
});

test('matchesOutboundRule: fails for the wrong day of week', () => {
  const leg = { departure: { airportCode: 'MSP', localTime: '2026-08-28T15:45:00' } }; // Friday
  const result = matchesOutboundRule(leg, DEFAULT_PROFILE);
  assert.equal(result.matches, false);
  assert.ok(result.reasons.some((r) => r.includes('Friday')));
});

test('matchesOutboundRule: fails for the wrong departure airport', () => {
  const leg = { departure: { airportCode: 'MKE', localTime: '2026-08-27T15:45:00' } };
  const result = matchesOutboundRule(leg, DEFAULT_PROFILE);
  assert.equal(result.matches, false);
  assert.ok(result.reasons.some((r) => r.includes('MKE')));
});

test('matchesReturnRule: an arrival right at the target is an excellent (high proximity) match', () => {
  const leg = { arrival: { airportCode: 'MSP', localTime: '2026-08-30T16:55:00' } }; // Sunday, near 5pm
  const result = matchesReturnRule(leg, DEFAULT_PROFILE);
  assert.equal(result.matches, true);
  assert.ok(result.proximityScore >= 90, `expected high proximity, got ${result.proximityScore}`);
});

test('matchesReturnRule: 3:15pm arrival is within a wider window but scores lower proximity', () => {
  const leg = { arrival: { airportCode: 'MSP', localTime: '2026-08-30T15:15:00' } };
  const result = matchesReturnRule(leg, DEFAULT_PROFILE);
  // Outside the default 16:00-18:00 window, so matches=false, but proximity is still computable.
  assert.equal(result.matches, false);
  assert.ok(result.proximityScore < 90);
});

test('matchesReturnRule: a 6:30pm arrival is outside the preferred window', () => {
  const leg = { arrival: { airportCode: 'MSP', localTime: '2026-08-30T18:30:00' } };
  const result = matchesReturnRule(leg, DEFAULT_PROFILE);
  assert.equal(result.matches, false);
  assert.ok(result.reasons.some((r) => r.includes('preferred window')));
});

test('matchesConnectionPreference: nonstop matches the default nonstop preference', () => {
  const flight = { segments: [{}] };
  const result = matchesConnectionPreference(flight, DEFAULT_PROFILE);
  assert.equal(result.matches, true);
  assert.equal(result.stops, 0);
});

test('matchesConnectionPreference: one connection fails the default nonstop preference', () => {
  const flight = { segments: [{}, {}] };
  const result = matchesConnectionPreference(flight, DEFAULT_PROFILE);
  assert.equal(result.matches, false);
  assert.equal(result.stops, 1);
  assert.ok(result.reasons.some((r) => r.includes('nonstop')));
});

test('matchesConnectionPreference: exceeding maxConnections is flagged even for a non-nonstop-preferring profile', () => {
  const flexibleProfile = { flight: { ...DEFAULT_PROFILE.flight, preferredType: 'any', maxConnections: 1 } };
  const flight = { segments: [{}, {}, {}] }; // 2 connections
  const result = matchesConnectionPreference(flight, flexibleProfile);
  assert.equal(result.matches, false);
  assert.equal(result.stops, 2);
  assert.ok(result.reasons.some((r) => r.includes('exceeds the configured max')));
});
