/**
 * Thin wrapper around Duffel's official Node.js SDK (@duffel/api). No business logic here — see
 * flightsAdapter.js for the isConfigured() gate and mapFlightOffer.js for turning a raw Duffel
 * offer into this app's normalized shape.
 *
 * Amadeus for Developers' self-service portal was decommissioned (Enterprise-only now, which
 * needs a sales process this project can't go through) — Duffel replaced it as the flight
 * provider target. DUFFEL_ACCESS_TOKEN determines the environment: a token prefixed
 * `duffel_test_` only ever touches Duffel's test data; a live token touches real inventory. There
 * is only one base URL (https://api.duffel.com) — the SDK handles that, not this wrapper.
 */

const { Duffel } = require('@duffel/api');

let client = null;

function getClient() {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('DUFFEL_ACCESS_TOKEN not set');
  }
  if (!client) {
    client = new Duffel({ token });
  }
  return client;
}

/**
 * params: { origin, destination, departureDate, returnDate, adults, cabinClass, maxConnections }
 * Returns the raw Duffel OfferRequest resource (including `.offers` since return_offers is
 * always requested) via the official SDK's typed client. Throws on transport/auth/validation
 * failure — callers must not invent data on catch.
 */
async function searchFlightOffers({ origin, destination, departureDate, returnDate, adults = 1, cabinClass, maxConnections }) {
  const duffel = getClient();

  // CreateOfferRequestSlice only needs origin/destination/departure_date — origin_type and
  // arrival_time/departure_time filters are optional and intentionally left unset here.
  const slices = [{ origin, destination, departure_date: departureDate }];
  if (returnDate) {
    slices.push({ origin: destination, destination: origin, departure_date: returnDate });
  }

  const passengers = Array.from({ length: adults }, () => ({ type: 'adult' }));

  const response = await duffel.offerRequests.create({
    slices,
    passengers,
    cabin_class: cabinClass,
    max_connections: maxConnections,
    return_offers: true,
  });

  return response.data; // OfferRequest, including .offers
}

function resetClientForTests() {
  client = null;
}

module.exports = { searchFlightOffers, resetClientForTests };
