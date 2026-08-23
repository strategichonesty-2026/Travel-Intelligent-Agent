const { discoverDestinations } = require('../domain/destinationDiscovery');
const { DEFAULT_TRIP_WEIGHTS, computeWeightedScore, mergeWeights } = require('../domain/scoringEngine');
const { BOOKING_STATUS } = require('../domain/bookingStatus');
const flightsAdapter = require('../adapters/flights/flightsAdapter');
const hotelsAdapter = require('../adapters/hotels/hotelsAdapter');

/**
 * Spec sections 3 and 28: the user supplies dates/budget/travelers/preferences, not a
 * destination. This discovers candidates, scores them against the (possibly user-overridden)
 * trip weights, and is explicit that flight/hotel pricing is not live — every candidate is
 * RESEARCH_ONLY until a configured flights/hotels adapter is available (see TECH_DECISION.md).
 */
async function getAutomaticRecommendations(input, { weightOverrides } = {}) {
  const weights = mergeWeights(DEFAULT_TRIP_WEIGHTS, weightOverrides);
  const candidates = discoverDestinations(input);

  const flightsConfigured = flightsAdapter.isConfigured();
  const hotelsConfigured = hotelsAdapter.isConfigured();

  return candidates.map((c) => {
    const scores = {
      seasonalFit: c.seasonalFitScore,
      location: c.preferenceMatchScore,
      // No live cost/flight/lodging data source is configured (see adapters/flights,
      // adapters/hotels) — these are intentionally left out of computeWeightedScore rather
      // than guessed, and it normalizes over the weights actually supplied.
    };
    const { total, breakdown } = computeWeightedScore(scores, weights);

    return {
      ...c,
      tripScore: total,
      tripScoreBreakdown: breakdown,
      bookingStatus: BOOKING_STATUS.RESEARCH_ONLY,
      bookingStatusReason: !flightsConfigured && !hotelsConfigured
        ? 'No flights/hotels adapter configured — see src/adapters/flights and src/adapters/hotels. This is a discovery candidate only.'
        : 'Flight/hotel data not yet fetched for this candidate.',
    };
  });
}

module.exports = { getAutomaticRecommendations };
