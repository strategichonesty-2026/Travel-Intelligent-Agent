const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const cache = require('../src/services/liveDataCache');

beforeEach(cache.clearCacheForTests);
afterEach(cache.clearCacheForTests);

test('getCacheEntry returns null when nothing is cached', () => {
  assert.equal(cache.getCacheEntry('some-key', 1000), null);
});

test('setCacheEntry then getCacheEntry returns the data, not stale, within the TTL', () => {
  cache.setCacheEntry('flights:MSP:DEN', { results: [1, 2, 3] });
  const entry = cache.getCacheEntry('flights:MSP:DEN', 60_000);
  assert.deepEqual(entry.data, { results: [1, 2, 3] });
  assert.equal(entry.stale, false);
});

test('a cache entry older than the TTL is marked stale but still returned', () => {
  cache.setCacheEntry('flights:MSP:DEN', { results: [1] });
  // TTL of -1ms means "already expired" without needing to actually sleep in the test.
  const entry = cache.getCacheEntry('flights:MSP:DEN', -1);
  assert.equal(entry.stale, true);
  assert.deepEqual(entry.data, { results: [1] });
});

test('different keys are cached independently', () => {
  cache.setCacheEntry('a', { v: 1 });
  cache.setCacheEntry('b', { v: 2 });
  assert.equal(cache.getCacheEntry('a', 60_000).data.v, 1);
  assert.equal(cache.getCacheEntry('b', 60_000).data.v, 2);
});
