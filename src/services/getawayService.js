/**
 * Flexible Getaway Finder (2026-10-09) — orchestrates the deep-link candidates from
 * getawayDiscovery.js with live Recreation.gov (RIDB) data when configured, classifies each
 * candidate's booking/budget/drive-time status, and computes the RV+campsite combo status
 * (deliverable E) when both are requested together.
 */
const ridbAdapter = require('../adapters/recreationGov/ridbAdapter');
const { buildStayCandidates } = require('../domain/getawayDiscovery');
const { STAY_TYPE } = require('../data/getawayStaySources');
const { BOOKING_STATUS, LINK_TYPE, combineRvAndSiteStatus } = require('../domain/bookingStatus');
const { classifyBudget } = require('../domain/budgetModel');
const { classifyTravelTime } = require('../domain/travelTimeModel');

function withDeepLinkStatus(candidate) {
  return {
    ...candidate,
    linkType: LINK_TYPE.INFORMATIONAL_SOURCE,
    bookingStatus: BOOKING_STATUS.RESEARCH_ONLY,
    bookingStatusReason: `${candidate.sourceName} has no live availability search this app can call (see TECH_DECISION.md) — this is a search link, not a confirmed listing.`,
  };
}

/**
 * RIDB's RECDATA facility schema (FacilityID/FacilityName/FacilityTypeDescription/
 * FacilityLatitude/FacilityLongitude) is official, public, and stable — not guessed. A facility
 * existing in RIDB confirms it's a real, currently-operating federal recreation site; it does
 * NOT confirm date-specific availability, which RIDB doesn't expose — so this stays at
 * CHECK_AVAILABILITY, never BOOKING_READY, same "don't overclaim from partial data" rule as the
 * rest of this codebase.
 */
function mapRidbFacility(facility) {
  return {
    sourceId: 'recreation-gov',
    sourceName: 'Recreation.gov',
    stayType: STAY_TYPE.CAMPSITE,
    apiTier: 'OFFICIAL',
    facilityId: facility.FacilityID ?? null,
    name: facility.FacilityName ?? null,
    description: facility.FacilityTypeDescription ?? null,
    latitude: facility.FacilityLatitude ?? null,
    longitude: facility.FacilityLongitude ?? null,
    deepLink: facility.FacilityID ? `https://www.recreation.gov/camping/campgrounds/${facility.FacilityID}` : null,
    linkType: LINK_TYPE.OFFICIAL_BOOKING,
    bookingStatus: BOOKING_STATUS.CHECK_AVAILABILITY,
    bookingStatusReason: "Recreation.gov facility confirmed to exist via the official RIDB API — check the facility's own page for real-time date availability.",
  };
}

/**
 * input: { stayTypes?: STAY_TYPE[], locationQuery?, startDate?, endDate?, budget?: profile.budget
 * shape, travelTime?: profile.travelTime shape, maxDriveHours?: number (shorthand for a simple
 * travelTime config when the caller doesn't have the full profile shape) }
 */
async function searchGetaways(input = {}) {
  const { stayTypes, locationQuery, startDate, endDate, budget, travelTime, maxDriveHours } = input;

  const deepLinkCandidates = buildStayCandidates({ stayTypes, locationQuery, startDate, endDate }).map(withDeepLinkStatus);

  let ridbCandidates = [];
  const wantsCampsites = !Array.isArray(stayTypes) || stayTypes.length === 0 || stayTypes.includes(STAY_TYPE.CAMPSITE);
  if (wantsCampsites && ridbAdapter.isConfigured() && locationQuery) {
    const ridbResult = await ridbAdapter.searchFacilities(locationQuery);
    ridbCandidates = (ridbResult.results || []).map(mapRidbFacility);
  }

  const travelTimeConfig =
    travelTime ?? (maxDriveHours != null ? { preferred: maxDriveHours, stretch: { enabled: false, max: maxDriveHours }, absoluteMax: maxDriveHours } : null);

  // No source here has live pricing or a real driving distance to a specific property — every
  // candidate's budget/drive-time status is honestly UNVERIFIED today, included anyway for UI
  // consistency with how the rest of the app presents these fields (never silently omitted,
  // never guessed).
  const allCandidates = [...ridbCandidates, ...deepLinkCandidates].map((c) => ({
    ...c,
    budgetStatus: budget ? classifyBudget(null, budget).status : null,
    driveTimeStatus: travelTimeConfig ? classifyTravelTime(null, travelTimeConfig).status : null,
  }));

  const rvCandidates = allCandidates.filter((c) => c.stayType === STAY_TYPE.RV_RENTAL);
  const siteCandidates = allCandidates.filter((c) => c.stayType === STAY_TYPE.CAMPSITE);
  const rvAndCampsiteRequested =
    !Array.isArray(stayTypes) || stayTypes.length === 0 || (stayTypes.includes(STAY_TYPE.RV_RENTAL) && stayTypes.includes(STAY_TYPE.CAMPSITE));

  let comboStatus = null;
  if (rvAndCampsiteRequested && rvCandidates.length > 0 && siteCandidates.length > 0) {
    const bestRv = rvCandidates.find((c) => c.bookingStatus === BOOKING_STATUS.BOOKING_READY) ?? rvCandidates[0];
    const bestSite = siteCandidates.find((c) => c.bookingStatus === BOOKING_STATUS.BOOKING_READY) ?? siteCandidates[0];
    comboStatus = combineRvAndSiteStatus(bestRv.bookingStatus, bestSite.bookingStatus);
  }

  return { candidates: allCandidates, comboStatus };
}

module.exports = { searchGetaways };
