const { test, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const placesClient = require('../src/adapters/hotels/placesClient');
const hotelsAdapter = require('../src/adapters/hotels/hotelsAdapter');
const { buildPlacesSearchResponse } = require('./fixtures/placesResult');

let originalKey;

beforeEach(() => {
  originalKey = process.env.GOOGLE_PLACES_API_KEY;
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
  else process.env.GOOGLE_PLACES_API_KEY = originalKey;
  mock.restoreAll();
});

test('isConfigured/searchHotels: no fabricated data when GOOGLE_PLACES_API_KEY is unset', async () => {
  delete process.env.GOOGLE_PLACES_API_KEY;
  assert.equal(hotelsAdapter.isConfigured(), false);

  const result = await hotelsAdapter.searchHotels({ latitude: 39.7392, longitude: -104.9903 });
  assert.equal(result.configured, false);
  assert.deepEqual(result.results, []);
  assert.ok(result.reason.includes('GOOGLE_PLACES_API_KEY'));
});

test('searchHotels: maps real places through when the provider call succeeds', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'fake-key-for-unit-test';
  mock.method(placesClient, 'searchPlaces', async () => buildPlacesSearchResponse());

  const result = await hotelsAdapter.searchHotels({ latitude: 39.7392, longitude: -104.9903 });

  assert.equal(result.configured, true);
  assert.equal(result.error, null);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].name, 'The Brown Palace Hotel');
  assert.equal(result.source, 'Google Places');
});

test('searchHotels: a provider failure returns no results and a real error, never a fabricated property', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'fake-key-for-unit-test';
  mock.method(placesClient, 'searchPlaces', async () => {
    throw new Error('Google Places search failed: 403 This API method requires billing to be enabled');
  });

  const result = await hotelsAdapter.searchHotels({ latitude: 39.7392, longitude: -104.9903 });

  assert.equal(result.configured, true);
  assert.deepEqual(result.results, []);
  assert.ok(result.error.includes('billing'));
});
