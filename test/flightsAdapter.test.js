const { test, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const duffelClient = require('../src/adapters/duffel/duffelClient');
const flightsAdapter = require('../src/adapters/flights/flightsAdapter');
const { buildMspLasRoundTripOffer } = require('./fixtures/duffelOffer');

let originalToken;

beforeEach(() => {
  originalToken = process.env.DUFFEL_ACCESS_TOKEN;
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.DUFFEL_ACCESS_TOKEN;
  else process.env.DUFFEL_ACCESS_TOKEN = originalToken;
  mock.restoreAll();
});

test('isConfigured/searchFlights: no fabricated data when DUFFEL_ACCESS_TOKEN is unset', async () => {
  delete process.env.DUFFEL_ACCESS_TOKEN;
  assert.equal(flightsAdapter.isConfigured(), false);

  const result = await flightsAdapter.searchFlights({ origin: 'MSP', destination: 'LAS', departDate: '2026-08-27', returnDate: '2026-08-30' });
  assert.equal(result.configured, false);
  assert.deepEqual(result.results, []);
  assert.ok(result.reason.includes('DUFFEL_ACCESS_TOKEN'));
});

test('searchFlights: maps real offers through when the provider call succeeds', async () => {
  process.env.DUFFEL_ACCESS_TOKEN = 'duffel_test_fake_for_unit_test';
  mock.method(duffelClient, 'searchFlightOffers', async () => ({
    offers: [buildMspLasRoundTripOffer()],
  }));

  const result = await flightsAdapter.searchFlights({ origin: 'MSP', destination: 'LAS', departDate: '2026-08-27', returnDate: '2026-08-30', travelers: 2 });

  assert.equal(result.configured, true);
  assert.equal(result.error, null);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].source, 'Duffel');
  assert.equal(result.results[0].totalPrice, 245.6);
});

test('searchFlights: a plain thrown error returns no results and the real message, never a fabricated flight', async () => {
  process.env.DUFFEL_ACCESS_TOKEN = 'duffel_test_fake_for_unit_test';
  mock.method(duffelClient, 'searchFlightOffers', async () => {
    throw new Error('Duffel flight search failed: 400 Invalid IATA code');
  });

  const result = await flightsAdapter.searchFlights({ origin: 'ZZZ', destination: 'LAS', departDate: '2026-08-27', returnDate: '2026-08-30' });

  assert.equal(result.configured, true);
  assert.deepEqual(result.results, []);
  assert.ok(result.error.includes('Invalid IATA code'));
});

test('searchFlights: a DuffelError (structured errors[], empty .message) is described from its real errors[] detail, not left blank', async () => {
  // Regression test: DuffelError extends Error but never calls super(message), so a naive
  // err.message read produces an empty string — caught live against a fake token during manual
  // verification (see the Phase 3 completion report) before this fix.
  process.env.DUFFEL_ACCESS_TOKEN = 'duffel_test_fake_for_unit_test';
  mock.method(duffelClient, 'searchFlightOffers', async () => {
    const err = new Error(); // DuffelError-shaped: real message lives in .errors[], not .message
    err.errors = [{ title: 'Access token not found', message: 'The access token you have used is not a valid API access token', code: 'authentication_error' }];
    throw err;
  });

  const result = await flightsAdapter.searchFlights({ origin: 'MSP', destination: 'DEN', departDate: '2026-08-27', returnDate: '2026-08-30' });

  assert.equal(result.configured, true);
  assert.deepEqual(result.results, []);
  assert.ok(result.error.length > 0, 'error must not be blank');
  assert.match(result.error, /Access token not found/);
  assert.match(result.error, /not a valid API access token/);
});
