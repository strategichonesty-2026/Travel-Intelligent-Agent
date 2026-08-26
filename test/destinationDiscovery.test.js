const { test } = require('node:test');
const assert = require('node:assert/strict');
const { discoverDestinations } = require('../src/domain/destinationDiscovery');
const { computeSeasonalFitScore } = require('../src/domain/seasonalEngine');

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

test('Phase 2: the full catalog is scored (not one pre-selected pool) — a low minScore in June surfaces both summer and off-season-but-still-scored warm entries', () => {
  // Before Phase 2 this only ever scored SUMMER_OUTDOOR_DESTINATIONS in June, so a warm-escape
  // destination could never appear here no matter how low minScore was set.
  const results = discoverDestinations({ startDate: '2026-06-20', preferences: [] }, { minScore: 0, limit: 50 });
  assert.ok(results.some((r) => r.name.includes('Cancun') || r.name.includes('Las Vegas') || r.name.includes('Phoenix')));
});

test('Phase 2: an off-season destination still scores low rather than being hidden by a hard pool gate', () => {
  const cancun = { id: 'x', name: 'Cancun', tags: ['mexico', 'warm-resort'], isColdWeather: false };
  const juneFit = computeSeasonalFitScore(cancun, '2026-06-20');
  const results = discoverDestinations({ startDate: '2026-06-20', preferences: [] }, { minScore: 0, limit: 50 });
  const cancunResult = results.find((r) => r.name.includes('Cancun'));
  assert.ok(cancunResult);
  assert.equal(cancunResult.seasonalFitScore, juneFit.score);
  assert.ok(cancunResult.seasonalFitScore < 40, 'an off-season warm destination should score below the default minScore');
});

test('categoryFilter restricts discovery to the given catalog categories regardless of season', () => {
  const results = discoverDestinations({ startDate: '2026-06-20', preferences: [] }, { minScore: 0, limit: 50, categoryFilter: ['mexico'] });
  assert.ok(results.length > 0);
  assert.ok(results.every((r) => r.category === 'mexico'));
});
