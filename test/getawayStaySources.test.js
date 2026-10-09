const { test } = require('node:test');
const assert = require('node:assert/strict');
const { STAY_TYPE, GETAWAY_STAY_SOURCES, sourcesForStayType, buildDeepLink } = require('../src/data/getawayStaySources');

test('sourcesForStayType returns only sources tagged with that stay type', () => {
  const rvSources = sourcesForStayType(STAY_TYPE.RV_RENTAL);
  assert.ok(rvSources.every((s) => s.stayTypes.includes(STAY_TYPE.RV_RENTAL)));
  assert.ok(rvSources.some((s) => s.id === 'rvshare'));
  assert.ok(rvSources.some((s) => s.id === 'outdoorsy'));
});

test('every source in the catalog has a non-empty stayTypes array', () => {
  for (const source of GETAWAY_STAY_SOURCES) {
    assert.ok(Array.isArray(source.stayTypes) && source.stayTypes.length > 0, `${source.id} has no stayTypes`);
  }
});

test('buildDeepLink builds a site-scoped Google search, never a guessed native search URL', () => {
  const source = sourcesForStayType(STAY_TYPE.CAMPSITE)[0];
  const url = buildDeepLink(source, { locationQuery: 'Hayward WI', startDate: '2026-11-01' });
  assert.ok(url.startsWith('https://www.google.com/search?q='));
  assert.ok(url.includes(encodeURIComponent(`site:${source.domain}`)));
  assert.ok(url.includes(encodeURIComponent('Hayward WI')));
});

test('buildDeepLink omits missing fields cleanly rather than producing "undefined" in the query', () => {
  const source = sourcesForStayType(STAY_TYPE.FARM_STAY)[0];
  const url = buildDeepLink(source, {});
  assert.ok(!url.toLowerCase().includes('undefined'));
});
