const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildDealBoard } = require('../src/services/dealBoard');
const { DEFAULT_PROFILE } = require('../src/data/defaultProfile');
const flightsAdapter = require('../src/adapters/flights/flightsAdapter');
const { buildMspLasRoundTripOffer } = require('./fixtures/duffelOffer');

afterEach(() => {
  mock.restoreAll();
});

test('buildDealBoard: camping filter returns only real researched campground rows with a computed cost', async () => {
  const rows = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'camping' });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.tripType === 'CAMPING'));
  const shellLake = rows.find((r) => r.destination.includes('Shell Lake') && r.destination.includes('Lakefront'));
  assert.ok(shellLake, 'expected Shell Lake lakefront row to be present');
  assert.equal(shellLake.totalCost.label, 'ESTIMATED');
  assert.ok(typeof shellLake.totalCost.amount === 'number' && shellLake.totalCost.amount > 0);
  assert.notEqual(shellLake.budgetStatus.status, 'UNVERIFIED');
});

test('buildDealBoard: general destination rows are honestly UNVERIFIED on cost/travel-time (no live adapter)', async () => {
  const rows = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'roadtrip' });
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal(row.totalCost.label, 'UNVERIFIED');
    assert.equal(row.totalCost.amount, null);
    assert.equal(row.budgetStatus.status, 'UNVERIFIED');
    assert.equal(row.travelTimeStatus.status, 'UNVERIFIED');
    assert.equal(row.bookingStatus, 'RESEARCH_ONLY');
  }
});

test('buildDealBoard: warm filter restricts to warm-escape categories regardless of current season', async () => {
  // Force a summer reference date — without the category restriction this would return
  // summer-outdoor candidates instead (or, post-Phase-2, a season-scored mix).
  const rows = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'warm', startDate: '2026-07-15' });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.tripType === 'WARM_ESCAPE'));
});

test('buildDealBoard: all filter merges camping and general rows, ranked and numbered', async () => {
  const rows = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'all' });
  assert.ok(rows.some((r) => r.tripType === 'CAMPING'));
  assert.ok(rows.some((r) => r.tripType !== 'CAMPING'));
  rows.forEach((r, i) => assert.equal(r.rank, i + 1));
});

test('buildDealBoard: sort=cost puts unverified (null cost) rows last regardless of direction', async () => {
  const asc = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'all', sort: 'cost', dir: 'asc' });
  const desc = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'all', sort: 'cost', dir: 'desc' });
  const lastAsc = asc[asc.length - 1];
  const lastDesc = desc[desc.length - 1];
  assert.equal(lastAsc.totalCost.amount, null);
  assert.equal(lastDesc.totalCost.amount, null);
});

test('buildDealBoard: candidates that hard-fail qualification are excluded from the ranked results by default', async () => {
  const rows = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'camping' });
  assert.ok(rows.every((r) => r.candidateStatus !== 'EXCLUDED'));
  // Baker Campground is a documented CONDITIONAL_FAILED (no lake view, no water hookup) — it
  // should not appear in the default deal-desk results even though it's a real favorite.
  assert.ok(!rows.some((r) => r.destination.includes('Baker Campground')));
});

test('buildDealBoard: includeExcluded=true surfaces the excluded candidates instead of hiding them', async () => {
  const hidden = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'camping', includeExcluded: false });
  const shown = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'camping', includeExcluded: true });
  assert.ok(shown.length > hidden.length);
  const baker = shown.find((r) => r.destination.includes('Baker Campground'));
  assert.ok(baker);
  assert.equal(baker.candidateStatus, 'EXCLUDED');
});

test('buildDealBoard: default value sort tiers RECOMMENDED above VALIDATED above UNVERIFIED', async () => {
  const rows = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'all' });
  const statusRank = { RECOMMENDED: 0, STRETCH: 1, VALIDATED: 2, CANDIDATE: 3, UNVERIFIED: 4, RESEARCHING: 4 };
  for (let i = 1; i < rows.length; i++) {
    assert.ok(statusRank[rows[i - 1].candidateStatus] <= statusRank[rows[i].candidateStatus], `row ${i} broke the status tier ordering`);
  }
  // Shell Lake's lakefront tier is the one real RECOMMENDED-caliber candidate in today's data.
  assert.equal(rows[0].candidateStatus, 'RECOMMENDED');
});

test('buildDealBoard: with Duffel configured, a general destination row gets a real flight summary and real travel-time status', async () => {
  const originalToken = process.env.DUFFEL_ACCESS_TOKEN;
  process.env.DUFFEL_ACCESS_TOKEN = 'duffel_test_fake_for_unit_test';
  mock.method(flightsAdapter, 'searchFlights', async () => ({
    configured: true,
    error: null,
    source: 'Duffel',
    checkedAt: '2026-08-26T12:00:00.000Z',
    results: [require('../src/adapters/flights/mapFlightOffer').mapFlightOffer(buildMspLasRoundTripOffer())],
  }));

  try {
    const rows = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'roadtrip' });
    const withFlight = rows.find((r) => r.flightSummary && r.flightSummary.startsWith('Delta'));
    assert.ok(withFlight, 'expected at least one row to get a real flight summary');
    assert.match(withFlight.flightSummary, /nonstop/);
    assert.notEqual(withFlight.travelTimeStatus.status, 'UNVERIFIED');
    assert.equal(withFlight.travelTimeStatus.hours, 2.58);
    // Trip-level cost stays UNVERIFIED even with a real flight price — lodging isn't priced yet.
    assert.equal(withFlight.totalCost.amount, null);
    assert.equal(withFlight.candidateStatus, 'UNVERIFIED');
  } finally {
    if (originalToken === undefined) delete process.env.DUFFEL_ACCESS_TOKEN;
    else process.env.DUFFEL_ACCESS_TOKEN = originalToken;
  }
});

test('buildDealBoard: a flight-search failure surfaces the real error, never a fabricated flight', async () => {
  const originalToken = process.env.DUFFEL_ACCESS_TOKEN;
  process.env.DUFFEL_ACCESS_TOKEN = 'duffel_test_fake_for_unit_test';
  mock.method(flightsAdapter, 'searchFlights', async () => ({
    configured: true,
    error: 'Duffel flight search failed: 422 Unprocessable — no availability',
    source: 'Duffel',
    checkedAt: '2026-08-26T12:00:00.000Z',
    results: [],
  }));

  try {
    const rows = await buildDealBoard({ profile: DEFAULT_PROFILE, filter: 'roadtrip' });
    // Every row's summary is one of the honest placeholders (failure, no-airport, lookup-skipped)
    // — never a fabricated-looking flight description.
    assert.ok(rows.every((r) => r.flightSummary.startsWith('Unverified')));
    assert.ok(rows.some((r) => r.flightSummary.includes('flight search failed')));
    assert.ok(rows.every((r) => r.travelTimeStatus.status === 'UNVERIFIED'));
  } finally {
    if (originalToken === undefined) delete process.env.DUFFEL_ACCESS_TOKEN;
    else process.env.DUFFEL_ACCESS_TOKEN = originalToken;
  }
});
