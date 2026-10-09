/**
 * Flexible Getaway Finder (2026-10-09) — the 9 provider sources researched in Stage 1, none of
 * which offer a live, date-specific availability search this codebase can call directly. Every
 * one of these is a deep-link-only candidate by default (LINK_TYPE.INFORMATIONAL_SOURCE in
 * bookingStatus.js) unless its own gated adapter (src/adapters/outdoorsy,
 * src/adapters/vrboLinkOff) reports isConfigured().
 *
 * Link strategy: a site-scoped Google search (`site:domain.com ...`), not a guessed native
 * search-page URL. This mirrors the home-hunting-agent sibling project's identical decision for
 * land-listing sites, and matches this codebase's own stated principle (TECH_DECISION.md: "No
 * booking or reservation URL is ever constructed by string concatenation from a template") —
 * guessing a site's internal search-URL query-param scheme risks a broken or silently wrong
 * link; a site-scoped Google search reliably works for all of them.
 */

const STAY_TYPE = Object.freeze({
  RV_RENTAL: 'RV_RENTAL',
  CAMPSITE: 'CAMPSITE',
  VACATION_RENTAL: 'VACATION_RENTAL', // cabins, lake houses, vacation homes
  FARM_STAY: 'FARM_STAY', // farmhouses, working farm stays, rural homesteads, agritourism
});

// apiTier documents what Stage 1 research actually found, not what's wired up yet:
//   'NONE'            — no API/partner program found at all
//   'AFFILIATE_ONLY'   — an affiliate/product-feed program exists, but not a search/availability API
//   'PARTNER_GATED'    — a real REST API exists but requires partner approval (see the matching
//                        adapter under src/adapters/ for the isConfigured() gate once approved)
const GETAWAY_STAY_SOURCES = Object.freeze([
  { id: 'rvshare', name: 'RVshare', domain: 'rvshare.com', stayTypes: [STAY_TYPE.RV_RENTAL], apiTier: 'AFFILIATE_ONLY' },
  { id: 'outdoorsy', name: 'Outdoorsy', domain: 'outdoorsy.com', stayTypes: [STAY_TYPE.RV_RENTAL], apiTier: 'PARTNER_GATED' },
  { id: 'rvezy', name: 'RVezy', domain: 'rvezy.com', stayTypes: [STAY_TYPE.RV_RENTAL], apiTier: 'NONE' },
  { id: 'hipcamp', name: 'Hipcamp', domain: 'hipcamp.com', stayTypes: [STAY_TYPE.CAMPSITE], apiTier: 'NONE' },
  { id: 'campspot', name: 'Campspot', domain: 'campspot.com', stayTypes: [STAY_TYPE.CAMPSITE], apiTier: 'NONE' },
  { id: 'koa', name: 'KOA', domain: 'koa.com', stayTypes: [STAY_TYPE.CAMPSITE], apiTier: 'NONE' },
  { id: 'airbnb', name: 'Airbnb', domain: 'airbnb.com', stayTypes: [STAY_TYPE.VACATION_RENTAL, STAY_TYPE.FARM_STAY], apiTier: 'NONE' },
  { id: 'vrbo', name: 'Vrbo', domain: 'vrbo.com', stayTypes: [STAY_TYPE.VACATION_RENTAL], apiTier: 'PARTNER_GATED' },
  { id: 'harvest-hosts', name: 'Harvest Hosts', domain: 'harvesthosts.com', stayTypes: [STAY_TYPE.FARM_STAY, STAY_TYPE.RV_RENTAL], apiTier: 'NONE' },
  { id: 'farm-stay-us', name: 'Farm Stay U.S.', domain: 'farmstayus.com', stayTypes: [STAY_TYPE.FARM_STAY], apiTier: 'NONE' },
]);

function sourcesForStayType(stayType) {
  return GETAWAY_STAY_SOURCES.filter((s) => s.stayTypes.includes(stayType));
}

/**
 * locationQuery: free-text ("Minnesota", "Hayward WI") — this codebase has no geocoding, so it's
 * passed through as typed by the caller, same honesty-over-precision tradeoff as everywhere else
 * a location can't be resolved to real coordinates.
 */
function buildDeepLink(source, { locationQuery, startDate, endDate } = {}) {
  const terms = [`site:${source.domain}`, locationQuery, startDate, endDate].filter(Boolean).join(' ');
  return `https://www.google.com/search?q=${encodeURIComponent(terms)}`;
}

module.exports = { STAY_TYPE, GETAWAY_STAY_SOURCES, sourcesForStayType, buildDeepLink };
