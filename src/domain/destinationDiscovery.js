const { getSeasonalContext, computeSeasonalFitScore } = require('./seasonalEngine');
const { SUMMER_OUTDOOR_DESTINATIONS, WARM_ESCAPE_DESTINATIONS } = require('../data/seasonalDestinations');

/**
 * Maps free-text traveler preferences (e.g. "Camping", "Scenery", "Waterfront") to the tag
 * vocabulary used across the destination catalog and seasonal engine.
 */
function normalizePreferenceTags(preferences = []) {
  const map = {
    camping: 'camping',
    scenery: 'scenic-drive',
    scenic: 'scenic-drive',
    waterfront: 'waterfront',
    lake: 'lakeside',
    lakeside: 'lakeside',
    hiking: 'hiking',
    swimming: 'swimming',
    fishing: 'fishing',
    warm: 'warm-resort',
    'warm weather': 'warm-resort',
    relaxation: 'warm-resort',
    resort: 'warm-resort',
    'road trip': 'road-trip',
  };
  return preferences
    .map((p) => map[String(p).toLowerCase().trim()])
    .filter(Boolean);
}

function preferenceOverlapScore(destinationTags, preferenceTags) {
  if (preferenceTags.length === 0) return 50; // no stated preference — don't penalize
  const overlap = preferenceTags.filter((t) => destinationTags.includes(t)).length;
  return Math.round((overlap / preferenceTags.length) * 100);
}

/**
 * Spec section 3/28: the user need not name a destination — only dates, budget, travelers,
 * and preferences. This discovers and ranks candidates instead of requiring one up front.
 *
 * input: { startDate, endDate, budget, travelers, preferences: string[] }
 * Returns ranked candidates with an explanation for why each was surfaced (never forces a weak
 * destination into the results — anything below minScore is dropped).
 */
function discoverDestinations(input, { minScore = 40, limit = 8 } = {}) {
  const { startDate, preferences = [] } = input;
  const seasonalContext = getSeasonalContext(startDate);
  const preferenceTags = normalizePreferenceTags(preferences);

  const pool = seasonalContext.season === 'WARM_ESCAPE'
    ? WARM_ESCAPE_DESTINATIONS
    : SUMMER_OUTDOOR_DESTINATIONS; // SHOULDER months fall back to the outdoor pool as a broad default

  const scored = pool.map((destination) => {
    const seasonalFit = computeSeasonalFitScore(destination, startDate);
    const preferenceMatch = preferenceOverlapScore(destination.tags, preferenceTags);
    const combined = Math.round(seasonalFit.score * 0.6 + preferenceMatch * 0.4);

    const matchedPreferenceTags = destination.tags.filter((t) => preferenceTags.includes(t));
    const reasonParts = [];
    if (matchedPreferenceTags.length > 0) {
      reasonParts.push(`matches stated preferences: ${matchedPreferenceTags.join(', ')}`);
    }
    reasonParts.push(seasonalFit.reason);

    return {
      destinationId: destination.id,
      name: destination.name,
      region: destination.region,
      seasonalFitScore: seasonalFit.score,
      preferenceMatchScore: preferenceMatch,
      discoveryScore: combined,
      season: seasonalContext.season,
      reason: reasonParts.join('; '),
    };
  });

  return scored
    .filter((d) => d.discoveryScore >= minScore)
    .sort((a, b) => b.discoveryScore - a.discoveryScore)
    .slice(0, limit);
}

module.exports = { discoverDestinations, normalizePreferenceTags };
