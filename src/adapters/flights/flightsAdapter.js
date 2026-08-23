/**
 * Flight search/booking adapter interface. TECH_DECISION.md recommends Amadeus for Developers
 * (official self-service flight-search API, free tier) as the primary candidate — see the
 * "Flight & Hotel Search" entry there. Not implemented: requires AMADEUS_CLIENT_ID/SECRET,
 * which this codebase does not have credentials for. Every call returns `configured: false`
 * until real credentials are supplied, so callers never fabricate flight data or prices.
 */

function isConfigured() {
  return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}

async function searchFlights(/* { origin, destination, departDate, returnDate, travelers } */) {
  if (!isConfigured()) {
    return {
      configured: false,
      reason: 'AMADEUS_CLIENT_ID/AMADEUS_CLIENT_SECRET not set. Flight recommendations cannot reach BOOKING_READY or CHECK_AVAILABILITY status without a live adapter — surface as RESEARCH_ONLY only.',
      results: [],
    };
  }
  throw new Error('Amadeus flight-search integration not yet implemented.');
}

module.exports = { isConfigured, searchFlights };
