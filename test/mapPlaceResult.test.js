const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapPlaceResult } = require('../src/adapters/hotels/mapPlaceResult');
const { buildPlacesSearchResponse } = require('./fixtures/placesResult');

test('mapPlaceResult maps a real-shaped Places result', () => {
  const raw = buildPlacesSearchResponse().places[0];
  const mapped = mapPlaceResult(raw);

  assert.equal(mapped.name, 'The Brown Palace Hotel');
  assert.equal(mapped.address, '321 17th St, Denver, CO 80202, USA');
  assert.equal(mapped.rating, 4.6);
  assert.equal(mapped.reviewCount, 3200);
  assert.equal(mapped.priceLevel, 'PRICE_LEVEL_EXPENSIVE');
  assert.equal(mapped.location.latitude, 39.7434);
  assert.equal(mapped.websiteUri, 'https://www.brownpalace.com/');
});

test('mapPlaceResult never throws and falls back to null on missing fields', () => {
  const mapped = mapPlaceResult({});
  assert.equal(mapped.name, null);
  assert.equal(mapped.rating, null);
  assert.equal(mapped.location, null);
  assert.deepEqual(mapped.types, []);
});
