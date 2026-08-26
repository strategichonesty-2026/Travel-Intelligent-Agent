/**
 * Flight search adapter — Duffel (official @duffel/api Node SDK; see TECH_DECISION.md's
 * "Flight & Hotel Search" entry — originally Amadeus, re-evaluated after Amadeus for Developers'
 * self-service portal was decommissioned in favor of Duffel's still-active self-service signup).
 * Every call returns `configured: false` until DUFFEL_ACCESS_TOKEN is set, so callers never
 * fabricate flight data or prices in its absence. A provider-side failure (bad route, no
 * availability, rate limit, network error, etc.) returns `configured: true, results: [], error:
 * ...` rather than throwing into the caller or inventing a fallback flight.
 */

const duffelClient = require('./duffelClient');
const { mapFlightOffer } = require('./mapFlightOffer');

function isConfigured() {
  return Boolean(process.env.DUFFEL_ACCESS_TOKEN);
}

/**
 * @duffel/api's DuffelError doesn't populate the standard Error.message — it carries a structured
 * `errors: [{ title, message, code, ... }]` array instead (see ApiResponseError in the SDK's
 * type definitions). A plain `err.message` on a DuffelError is silently empty, which would have
 * produced an uninformative "flight search failed: " with nothing after the colon — this pulls
 * the real detail out instead, falling back to err.message for any other kind of thrown error
 * (network failure, timeout, programmer error, etc.).
 */
function describeFlightError(err) {
  const first = err?.errors?.[0];
  if (first) {
    return [first.title, first.message].filter(Boolean).join(' — ') || first.code || 'Duffel API error';
  }
  return err?.message || 'Unknown flight search error';
}

/**
 * params: { origin, destination, departDate, returnDate, travelers, cabinClass, maxConnections }
 * departDate/returnDate: 'YYYY-MM-DD'
 */
async function searchFlights({ origin, destination, departDate, returnDate, travelers = 1, cabinClass, maxConnections } = {}) {
  if (!isConfigured()) {
    return {
      configured: false,
      reason: 'DUFFEL_ACCESS_TOKEN not set. Flight recommendations cannot reach BOOKING_READY or CHECK_AVAILABILITY status without a live adapter — surface as RESEARCH_ONLY only.',
      results: [],
      source: 'Duffel',
      checkedAt: null,
    };
  }

  const checkedAt = new Date().toISOString();

  try {
    const offerRequest = await duffelClient.searchFlightOffers({
      origin,
      destination,
      departureDate: departDate,
      returnDate,
      adults: travelers,
      cabinClass,
      maxConnections,
    });

    const results = (offerRequest?.offers || []).map(mapFlightOffer);

    return { configured: true, results, source: 'Duffel', checkedAt, error: null };
  } catch (err) {
    // Provider failure (bad IATA code, no availability, rate limit, network error, etc.) — never
    // invent a flight to fill the gap; report the failure and return no results.
    return { configured: true, results: [], source: 'Duffel', checkedAt, error: describeFlightError(err) };
  }
}

module.exports = { isConfigured, searchFlights };
