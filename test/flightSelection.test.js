const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapFlightOffer } = require('../src/adapters/flights/mapFlightOffer');
const { evaluateOffer, selectBestFlight } = require('../src/domain/flightSelection');
const { buildMspLasRoundTripOffer, buildOneStopOutboundSlice } = require('./fixtures/duffelOffer');
const { DEFAULT_PROFILE } = require('../src/data/defaultProfile');

test('evaluateOffer: a schedule-matching nonstop round trip evaluates as a full match', () => {
  const offer = mapFlightOffer(buildMspLasRoundTripOffer());
  const evaluated = evaluateOffer(offer, DEFAULT_PROFILE);
  assert.ok(evaluated);
  assert.equal(evaluated.scheduleMatches, true);
  assert.equal(evaluated.totalStops, 0);
  assert.equal(evaluated.oneWayTravelHours, 2.58);
});

test('evaluateOffer: returns null for an offer missing a return leg (one-way, not the round trip we asked for)', () => {
  const raw = buildMspLasRoundTripOffer();
  raw.slices = [raw.slices[0]]; // outbound only
  const offer = mapFlightOffer(raw);
  const evaluated = evaluateOffer(offer, DEFAULT_PROFILE);
  assert.equal(evaluated, null);
});

test('selectBestFlight: prefers the nonstop, schedule-matching offer over a cheaper connecting one', () => {
  const nonstop = mapFlightOffer(buildMspLasRoundTripOffer({ id: 'nonstop', total_amount: '300.00' }));
  const connectingRaw = buildMspLasRoundTripOffer({ id: 'connecting', total_amount: '180.00' });
  connectingRaw.slices[0] = buildOneStopOutboundSlice();
  const connecting = mapFlightOffer(connectingRaw);

  const best = selectBestFlight([connecting, nonstop], DEFAULT_PROFILE);
  assert.equal(best.offer.offerId, 'nonstop');
});

test('selectBestFlight: among equally-good schedule matches, prefers lower price', () => {
  const cheap = mapFlightOffer(buildMspLasRoundTripOffer({ id: 'cheap', total_amount: '199.00' }));
  const pricey = mapFlightOffer(buildMspLasRoundTripOffer({ id: 'pricey', total_amount: '450.00' }));

  const best = selectBestFlight([pricey, cheap], DEFAULT_PROFILE);
  assert.equal(best.offer.offerId, 'cheap');
});

test('selectBestFlight: returns null when nothing is a usable round-trip offer', () => {
  const raw = buildMspLasRoundTripOffer();
  raw.slices = [raw.slices[0]];
  const offer = mapFlightOffer(raw);
  assert.equal(selectBestFlight([offer], DEFAULT_PROFILE), null);
  assert.equal(selectBestFlight([], DEFAULT_PROFILE), null);
});

test('selectBestFlight: a schedule-violating offer still gets picked if nothing else qualifies (never silently empty when data exists)', () => {
  const badTimeRaw = buildMspLasRoundTripOffer({ id: 'bad-time' });
  badTimeRaw.slices[0].segments[0].departing_at = '2026-08-27T09:00:00'; // before 3pm rule
  const offer = mapFlightOffer(badTimeRaw);
  const best = selectBestFlight([offer], DEFAULT_PROFILE);
  assert.ok(best);
  assert.equal(best.scheduleMatches, false);
});
