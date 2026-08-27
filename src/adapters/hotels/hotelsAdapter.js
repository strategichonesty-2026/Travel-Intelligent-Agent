/**
 * Hotel/lodging search adapter — Google Places API (New).
 *
 * Provider history: Amadeus (original Phase-0 pick) died with its self-service portal shutdown.
 * Duffel — already integrated for flights — was tried next, but Duffel Stays (hotels) turned out
 * to be gated behind a sales conversation on this account (confirmed live: "This feature is not
 * enabled for your account. Please contact sales."). A proper Phase 0-style re-evaluation of
 * Booking.com Demand API (partner registration currently closed to new applicants), Expedia Rapid
 * API (requires partner application + case-by-case approval), and RateHawk (partner-gated,
 * explicitly favors established travel-tech platforms) found every major hotel-PRICING provider
 * gated behind sales/partnership — a real structural fact about hotel distribution (commission
 * agreements, compliance), not a search failure. Google Places API (New) was chosen as the one
 * genuinely self-service option left — see TECH_DECISION.md's Phase 4 addendum.
 *
 * Trade-off, stated plainly: Places has NO pricing, availability, fee, or cancellation-policy
 * data — it's a places/business-info API. This adapter surfaces real property name, address,
 * rating, review count, and location — cost/fees/cancellation stay honestly UNVERIFIED rather
 * than fabricated, exactly like flights before a real flight provider existed.
 *
 * Every call returns `configured: false` until GOOGLE_PLACES_API_KEY is set. A provider-side
 * failure returns `configured: true, results: [], error: ...` rather than inventing a property.
 */

// Required as the whole module object (not destructured) so test mocks (mock.method(placesClient,
// 'searchPlaces', ...)) actually intercept calls made from here — destructuring would capture the
// original function reference at require time instead of a live binding to the module's property.
const placesClient = require('./placesClient');
const { mapPlaceResult } = require('./mapPlaceResult');

function isConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

/**
 * params: { latitude, longitude, radiusMeters, query }
 */
async function searchHotels({ latitude, longitude, radiusMeters = 15000, query = 'hotel' } = {}) {
  if (!isConfigured()) {
    return {
      configured: false,
      reason: 'GOOGLE_PLACES_API_KEY not set. Lodging recommendations show real property data only once configured — no pricing is ever available from this provider, by design.',
      results: [],
      source: 'Google Places',
      checkedAt: null,
    };
  }

  const checkedAt = new Date().toISOString();

  try {
    const raw = await placesClient.searchPlaces({ latitude, longitude, radiusMeters, query });
    const results = (raw?.places || []).map(mapPlaceResult);
    return { configured: true, results, source: 'Google Places', checkedAt, error: null };
  } catch (err) {
    return { configured: true, results: [], source: 'Google Places', checkedAt, error: err.message };
  }
}

module.exports = { isConfigured, searchHotels };
