/**
 * Flexible Getaway Finder (2026-10-09) — pure candidate-building logic, no network calls. Every
 * candidate starts as a deep-link-only entry (see getawayStaySources.js for why: none of the 9
 * provider sites offer a live search API this codebase can call). getawayService.js layers live
 * RIDB data and bookingStatus/comboStatus classification on top of what this returns.
 */
const { STAY_TYPE, sourcesForStayType, buildDeepLink } = require('../data/getawayStaySources');

/**
 * stayTypes: array of STAY_TYPE values, or omitted/empty for "all types" — matches the spec's
 * "I want options across RV rental, campsite, cabin, farm stay..." framing (no single type
 * required, same "no destination required" spirit as destinationDiscovery.js).
 */
function buildStayCandidates({ stayTypes, locationQuery, startDate, endDate } = {}) {
  const types = Array.isArray(stayTypes) && stayTypes.length > 0 ? stayTypes : Object.values(STAY_TYPE);

  const candidates = [];
  for (const stayType of types) {
    for (const source of sourcesForStayType(stayType)) {
      candidates.push({
        sourceId: source.id,
        sourceName: source.name,
        stayType,
        apiTier: source.apiTier,
        deepLink: buildDeepLink(source, { locationQuery, startDate, endDate }),
      });
    }
  }
  return candidates;
}

module.exports = { buildStayCandidates };
