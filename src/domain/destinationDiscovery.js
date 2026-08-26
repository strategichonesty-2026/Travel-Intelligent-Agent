const { getSeasonalContext, computeSeasonalFitScore } = require('./seasonalEngine');
const { SUMMER_OUTDOOR_DESTINATIONS, WARM_ESCAPE_DESTINATIONS, CRUISE_DESTINATIONS } = require('../data/seasonalDestinations');

const ALL_DESTINATIONS = [...SUMMER_OUTDOOR_DESTINATIONS, ...WARM_ESCAPE_DESTINATIONS, ...CRUISE_DESTINATIONS];

/**
 * Unlike discoverDestinations (which only scores the one seasonally-relevant pool and drops
 * anything below minScore), this returns every catalog entry for a given category regardless of
 * season — used for browsing a category tab (e.g. "Mexico") rather than getting best-match
 * recommendations. Still computes a seasonal fit for the given date so the browse view can show
 * whether now is actually a good time to go.
 */
function getDestinationsByCategory(category, startDate) {
  return ALL_DESTINATIONS
    .filter((d) => d.category === category)
    .map((d) => {
      const seasonalFit = computeSeasonalFitScore(d, startDate);
      return { ...d, seasonalFitScore: seasonalFit.score, seasonalFitReason: seasonalFit.reason };
    });
}

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
 * Spec section 3/28 (Phase 1) and Phase 2's "not limited to a hard-coded destination catalog":
 * the user need not name a destination — only dates, budget, travelers, and preferences. This
 * discovers and ranks candidates instead of requiring one up front.
 *
 * Phase 2 change: this used to pre-select a single pool (SUMMER_OUTDOOR or WARM_ESCAPE) by the
 * query date's season before scoring anything, which meant a destination could never surface
 * outside its "home" pool no matter how well it scored. It now scores the FULL catalog every
 * time and lets computeSeasonalFitScore (an honest, date-driven function — see seasonalEngine.js)
 * do the filtering: an off-season destination still gets scored, it just scores low and drops
 * below minScore naturally, rather than being excluded from consideration before scoring even
 * starts. The discovery engine is no longer structurally limited to one hardcoded pool — it's
 * still a finite curated list (a live destination-search provider is out of scope until a future
 * phase), but nothing about the ranking logic itself gates which entries can be considered.
 *
 * input: { startDate, endDate, budget, travelers, preferences: string[] }
 * options.categoryFilter: optional array of catalog `category` values to restrict browsing to
 * (e.g. ["mexico","socal","florida","southwest"] for a "warm getaway" browse) — a legitimate
 * category restriction, distinct from the old season-based pool pre-selection this replaces.
 * Returns ranked candidates with an explanation for why each was surfaced (never forces a weak
 * destination into the results — anything below minScore is dropped).
 */
function discoverDestinations(input, { minScore = 40, limit = 8, categoryFilter } = {}) {
  const { startDate, preferences = [] } = input;
  const seasonalContext = getSeasonalContext(startDate);
  const preferenceTags = normalizePreferenceTags(preferences);

  const pool = Array.isArray(categoryFilter)
    ? ALL_DESTINATIONS.filter((d) => categoryFilter.includes(d.category))
    : ALL_DESTINATIONS;

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
      category: destination.category,
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

module.exports = { discoverDestinations, normalizePreferenceTags, getDestinationsByCategory };
