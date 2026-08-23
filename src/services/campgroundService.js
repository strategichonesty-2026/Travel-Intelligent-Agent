const { FAVORITE_CAMPGROUNDS, SIMILAR_CAMPGROUND_DISCOVERY } = require('../data/favoriteCampgrounds');
const { evaluateCampsiteQualification, QUALIFICATION_VERDICT, calculateCampingTotalCost } = require('../domain/campingQualification');
const { DEFAULT_CAMPING_WEIGHTS, computeWeightedScore } = require('../domain/scoringEngine');
const { validateBookingLink, determineBookingStatus, determineButtonLabel, LINK_TYPE } = require('../domain/bookingStatus');

function toQualificationInput(campground) {
  return {
    waterfrontStatus: campground.waterfrontStatus,
    waterHookup: campground.waterHookup,
    electricHookup: campground.electricHookup,
    bathhouse: campground.bathhouse,
    drivingHoursFrom55449: campground.drivingHoursFrom55449,
  };
}

function listFavorites() {
  return FAVORITE_CAMPGROUNDS.map((c) => ({
    ...c,
    qualification: evaluateCampsiteQualification(toQualificationInput(c)),
  }));
}

function getQualifiedFavorites() {
  return listFavorites().filter((c) => c.qualification.verdict === QUALIFICATION_VERDICT.QUALIFIED);
}

function findFavoriteById(id) {
  const found = FAVORITE_CAMPGROUNDS.find((c) => c.id === id) || SIMILAR_CAMPGROUND_DISCOVERY.find((c) => c.id === id);
  if (!found) return null;
  return { ...found, qualification: evaluateCampsiteQualification(toQualificationInput(found)) };
}

/**
 * Spec section 11: campgrounds discovered as similar to the favorite list but not on it.
 * Same strict qualification evaluation applies — nothing here is pre-qualified.
 */
function listSimilarDiscoveries() {
  return SIMILAR_CAMPGROUND_DISCOVERY.map((c) => ({
    ...c,
    qualification: evaluateCampsiteQualification(toQualificationInput(c)),
  }));
}

/**
 * Live accessibility check for spec section 15 requirement #5. Does not attempt to fabricate a
 * URL — only checks one already present on the record.
 */
async function checkLinkAccessible(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.ok || (res.status >= 300 && res.status < 400);
  } catch {
    return false;
  }
}

/**
 * Builds the booking-side view for a campground: link validation, booking status, button label,
 * and the mandatory price/verification disclaimer (spec sections 5-7, 15, 26).
 */
async function buildBookingInfo(campground) {
  const hasReservationUrl = Boolean(campground.officialReservationUrl);
  const accessible = hasReservationUrl ? await checkLinkAccessible(campground.officialReservationUrl) : false;

  const linkValidation = hasReservationUrl
    ? validateBookingLink({
      urlExists: true,
      // These two require a human/researcher to have confirmed the URL is the property's own
      // official system and not a lookalike — verification.confidence HIGH/MEDIUM is our proxy.
      belongsToAuthorizedProvider: ['HIGH', 'MEDIUM'].includes(campground.verification?.confidence),
      matchesProperty: ['HIGH', 'MEDIUM'].includes(campground.verification?.confidence),
      notObviouslyExpired: true,
      isAccessible: accessible,
      reservationMechanismIdentifiable: hasReservationUrl,
    })
    : null;

  const qualification = evaluateCampsiteQualification(toQualificationInput(campground));

  const status = determineBookingStatus({
    mandatoryConstraintsPassed: qualification.verdict === QUALIFICATION_VERDICT.QUALIFIED,
    currentPriceVerified: Boolean(campground.nightlyRate && campground.verification?.verifiedAt),
    currentAvailabilityVerified: null, // this codebase has no live availability feed for these properties
    bookingSourceIdentified: hasReservationUrl,
    mandatoryFeesIdentified: Boolean(campground.nightlyRate),
    criticalAmenitiesVerified: qualification.verdict === QUALIFICATION_VERDICT.QUALIFIED,
    cancellationPolicyIdentified: campground.cancellationPolicy != null ? true : false,
    bookingLinkValidation: linkValidation,
  });

  return {
    linkType: hasReservationUrl ? LINK_TYPE.OFFICIAL_BOOKING : LINK_TYPE.INFORMATIONAL_SOURCE,
    linkValidation,
    bookingStatus: status,
    buttonLabel: hasReservationUrl && linkValidation?.valid ? determineButtonLabel({ availabilityVerified: false }) : null,
    bookingUrl: linkValidation?.valid ? campground.officialReservationUrl : null,
    priceDisclaimer: campground.verification?.verifiedAt
      ? `Price verified at ${new Date(campground.verification.verifiedAt).toISOString()}. Final price is confirmed by the booking provider at checkout.`
      : null,
  };
}

/**
 * Spec section 20: camping value ranking + BEST VALUE / BEST FACILITIES / BEST SCENERY /
 * BEST CLOSE-TO-HOME labels. `perCampgroundScores` supplies the 0-100 sub-scores this codebase
 * cannot derive on its own (siteQuality, recreation) alongside ones it can (drivingConvenience
 * from drivingHoursFrom55449, evidenceConfidence from verification.confidence).
 */
function rankFavoritesByValue(campgrounds, { weights = DEFAULT_CAMPING_WEIGHTS, perCampgroundScores = {} } = {}) {
  const confidenceScore = { HIGH: 100, MEDIUM: 60, LOW: 20 };

  const ranked = campgrounds.map((c) => {
    const extra = perCampgroundScores[c.id] || {};
    const scores = {
      hookupQuality: extra.hookupQuality ?? (c.waterHookup === 'YES' && c.electricHookup === 'YES' ? 100 : 0),
      bathhouseQuality: extra.bathhouseQuality ?? ([c.bathhouse?.flushToilets, c.bathhouse?.hotColdWater, c.bathhouse?.hotShowers].every((v) => v === 'YES') ? 100 : 0),
      cost: extra.cost ?? null,
      drivingConvenience: typeof c.drivingHoursFrom55449 === 'number' ? Math.max(0, 100 - c.drivingHoursFrom55449 * 15) : null,
      recreation: extra.recreation ?? null,
      siteQuality: extra.siteQuality ?? null,
      reservationFlexibility: extra.reservationFlexibility ?? null,
      evidenceConfidence: confidenceScore[c.verification?.confidence] ?? 20,
    };
    const definedScores = Object.fromEntries(Object.entries(scores).filter(([, v]) => v != null));
    const { total, breakdown } = computeWeightedScore(definedScores, weights);
    return { ...c, valueScore: total, valueBreakdown: breakdown };
  });

  ranked.sort((a, b) => b.valueScore - a.valueScore);

  const labels = {};
  if (ranked.length > 0) labels[ranked[0].id] = 'BEST VALUE';
  const byFacilities = [...ranked].sort((a, b) => (b.valueBreakdown.bathhouseQuality?.contribution ?? 0) + (b.valueBreakdown.hookupQuality?.contribution ?? 0) - ((a.valueBreakdown.bathhouseQuality?.contribution ?? 0) + (a.valueBreakdown.hookupQuality?.contribution ?? 0)))[0];
  if (byFacilities) labels[byFacilities.id] = labels[byFacilities.id] || 'BEST FACILITIES';
  const byClose = [...ranked].filter((c) => typeof c.drivingHoursFrom55449 === 'number').sort((a, b) => a.drivingHoursFrom55449 - b.drivingHoursFrom55449)[0];
  if (byClose) labels[byClose.id] = labels[byClose.id] || 'BEST CLOSE-TO-HOME';

  return ranked.map((c) => ({ ...c, valueLabel: labels[c.id] || null }));
}

module.exports = {
  listFavorites,
  getQualifiedFavorites,
  findFavoriteById,
  listSimilarDiscoveries,
  buildBookingInfo,
  rankFavoritesByValue,
  calculateCampingTotalCost,
};
