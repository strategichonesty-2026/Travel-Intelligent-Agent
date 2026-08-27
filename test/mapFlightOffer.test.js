const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapFlightOffer, parseIsoDurationHours, parseMoney } = require('../src/adapters/flights/mapFlightOffer');
const { buildMspLasRoundTripOffer, buildOneStopOutboundSlice } = require('./fixtures/duffelOffer');

test('parseIsoDurationHours parses PT#H#M correctly', () => {
  assert.equal(parseIsoDurationHours('PT2H35M'), 2.58);
  assert.equal(parseIsoDurationHours('PT2H'), 2);
  assert.equal(parseIsoDurationHours('PT45M'), 0.75);
  assert.equal(parseIsoDurationHours(null), null);
  assert.equal(parseIsoDurationHours('garbage'), null);
});

test('parseMoney parses a Duffel money string to a number', () => {
  assert.equal(parseMoney('245.60'), 245.6);
  assert.equal(parseMoney(null), null);
  assert.equal(parseMoney('not-a-number'), null);
});

test('mapFlightOffer maps price, itineraries, and segment details from a real-shaped offer', () => {
  const raw = buildMspLasRoundTripOffer();
  const mapped = mapFlightOffer(raw);

  assert.equal(mapped.source, 'Duffel');
  assert.equal(mapped.totalPrice, 245.6);
  assert.equal(mapped.basePrice, 210);
  assert.equal(mapped.currency, 'USD');
  assert.equal(mapped.owningAirline.code, 'DL');

  assert.equal(mapped.itineraries.length, 2);
  const outbound = mapped.itineraries[0];
  assert.equal(outbound.stops, 0);
  assert.equal(outbound.durationHours, 2.58);
  assert.equal(outbound.segments.length, 1);

  const seg = outbound.segments[0];
  assert.equal(seg.carrierCode, 'DL');
  assert.equal(seg.airlineName, 'Delta Air Lines');
  assert.equal(seg.flightNumber, 'DL1234');
  assert.equal(seg.departure.airportCode, 'MSP');
  assert.equal(seg.departure.localTime, '2026-08-27T15:45:00');
  assert.equal(seg.departure.timeZone, 'America/Chicago');
  assert.equal(seg.arrival.airportCode, 'LAS');
  assert.equal(seg.arrival.timeZone, 'America/Los_Angeles');
  assert.equal(seg.departure.latitude, 44.883378);
  assert.equal(seg.arrival.longitude, -115.152);
  assert.equal(seg.checkedBagsIncluded, 1);
  assert.equal(seg.cabinClass, 'economy');
});

test('mapFlightOffer counts stops correctly for a connecting itinerary', () => {
  const raw = buildMspLasRoundTripOffer();
  raw.slices[0] = buildOneStopOutboundSlice();
  const mapped = mapFlightOffer(raw);
  assert.equal(mapped.itineraries[0].stops, 1);
  assert.equal(mapped.itineraries[0].segments.length, 2);
});

test('mapFlightOffer never throws and falls back to null on missing fields', () => {
  const mapped = mapFlightOffer({});
  assert.equal(mapped.totalPrice, null);
  assert.equal(mapped.owningAirline, null);
  assert.deepEqual(mapped.itineraries, []);
});
