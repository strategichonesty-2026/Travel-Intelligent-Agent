const { test } = require('node:test');
const assert = require('node:assert/strict');
const { discoverDestinations } = require('../src/domain/destinationDiscovery');

test('summer camping request surfaces camping/waterfront destinations, not warm-escape ones', () => {
  const results = discoverDestinations({
    startDate: '2026-06-20',
    preferences: ['Camping', 'Scenery', 'Waterfront'],
  });
  assert.ok(results.length > 0);
  assert.ok(results.every((r) => r.season === 'SUMMER_OUTDOOR'));
  assert.ok(results.some((r) => r.name.toLowerCase().includes('wisconsin') || r.name.toLowerCase().includes('shell lake') || r.name.toLowerCase().includes('st. croix')));
});

test('November warm-weather request surfaces warm destinations', () => {
  const results = discoverDestinations({
    startDate: '2026-11-20',
    preferences: ['Warm weather', 'Relaxation'],
  });
  assert.ok(results.length > 0);
  assert.ok(results.every((r) => r.season === 'WARM_ESCAPE'));
  assert.ok(results.every((r) => !/minnesota|wisconsin|iowa/i.test(r.name)));
});

test('every discovered destination has a non-empty explanation', () => {
  const results = discoverDestinations({ startDate: '2026-07-01', preferences: ['Camping'] });
  for (const r of results) {
    assert.ok(r.reason && r.reason.length > 0);
  }
});
