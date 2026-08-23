/**
 * The traveler's persistent Favorite Campground List (spec section 10).
 *
 * STATUS: seed skeleton. Each entry below is the traveler's originally-supplied name with
 * fields defaulted to UNKNOWN pending sourced research (spec sections 10, 15, 21) — nothing
 * here should be treated as verified until `verification.confidence` is HIGH or MEDIUM and
 * `verification.sources` is non-empty. This file is regenerated from
 * data/campground-research.md once that research pass completes; do not hand-edit facts here
 * without a source URL.
 */

const { WATERFRONT_STATUS, HOOKUP, AMPERAGE, EVIDENCE_CONFIDENCE } = require('../domain/campingQualification');

function unresearchedEntry(name) {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    name,
    location: null,
    drivingHoursFrom55449: null,
    officialWebsiteUrl: null,
    officialReservationUrl: null,
    seasonOfOperation: null,
    siteTypes: [],
    waterfrontStatus: WATERFRONT_STATUS.UNKNOWN,
    waterHookup: HOOKUP.UNKNOWN,
    electricHookup: HOOKUP.UNKNOWN,
    electricAmperage: AMPERAGE.UNKNOWN,
    sewerHookup: HOOKUP.UNKNOWN,
    bathhouse: { flushToilets: HOOKUP.UNKNOWN, hotColdWater: HOOKUP.UNKNOWN, hotShowers: HOOKUP.UNKNOWN },
    nightlyRate: null,
    cancellationPolicy: null,
    verification: {
      confidence: EVIDENCE_CONFIDENCE.LOW,
      sources: [],
      verifiedAt: null,
      notes: 'Not yet researched — supplied by the traveler as a name only.',
    },
  };
}

const FAVORITE_CAMPGROUND_NAMES = [
  'DOVR',
  'Champions Riverside Resort',
  'Highland Ridge Campground',
  'Two Rivers Campground',
  'Jay Cooke State Park',
  'Travel Resorts / St. Croix River',
  'Wild River State Park',
  'William O\'Brien State Park',
  'Baker Campground / Three Rivers Parks',
  'Wisconsin GoingToCamp system',
  'Shell Lake Municipal Campground',
  'Country Camping',
  'Pettibone Resort',
  'Herbster Wisconsin campgrounds',
];

const FAVORITE_CAMPGROUNDS = FAVORITE_CAMPGROUND_NAMES.map(unresearchedEntry);

module.exports = { FAVORITE_CAMPGROUNDS };
