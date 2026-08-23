const WATERFRONT_STATUS = Object.freeze({
  DIRECT_WATERFRONT: 'DIRECT_WATERFRONT',
  LAKE_VIEW: 'LAKE_VIEW',
  LAKE_ACCESS: 'LAKE_ACCESS', // campground-level access only — does not satisfy the traveler's site-level requirement
  UNKNOWN: 'UNKNOWN',
});

// Only these two satisfy the traveler's "individual site is waterfront or lake-view" requirement.
const QUALIFYING_WATERFRONT_STATUSES = [WATERFRONT_STATUS.DIRECT_WATERFRONT, WATERFRONT_STATUS.LAKE_VIEW];

const HOOKUP = Object.freeze({ YES: 'YES', NO: 'NO', UNKNOWN: 'UNKNOWN' });
const AMPERAGE = Object.freeze({ A30: '30A', A50: '50A', UNKNOWN: 'UNKNOWN' });

const EVIDENCE_CONFIDENCE = Object.freeze({
  HIGH: 'HIGH', // official reservation system exposes site-level facts (e.g. Shell Lake's site-level listings)
  MEDIUM: 'MEDIUM', // official source, but only campground-level claims
  LOW: 'LOW', // third-party/aggregator only
});

const QUALIFICATION_VERDICT = Object.freeze({
  QUALIFIED: 'QUALIFIED',
  CONDITIONAL_FAILED: 'CONDITIONAL_FAILED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
});

const REGIONAL_TIER = Object.freeze({
  TIER_1: 'TIER_1', // 0-3h
  TIER_2: 'TIER_2', // 3-4h
  TIER_3: 'TIER_3', // 4-5h
  BEYOND_PREFERRED_RADIUS: 'BEYOND_PREFERRED_RADIUS', // >5h — only shown if allowed or exceptional
});

const DEFAULT_CAMPING_SEASON = Object.freeze({ start: { month: 6, day: 1 }, end: { month: 8, day: 31 } });

function classifyDrivingTier(hours) {
  if (hours <= 3) return REGIONAL_TIER.TIER_1;
  if (hours <= 4) return REGIONAL_TIER.TIER_2;
  if (hours <= 5) return REGIONAL_TIER.TIER_3;
  return REGIONAL_TIER.BEYOND_PREFERRED_RADIUS;
}

/**
 * campsite: {
 *   waterfrontStatus, waterHookup, electricHookup, electricAmperage,
 *   bathhouse: { flushToilets, hotColdWater, hotShowers } (each HOOKUP.YES/NO/UNKNOWN),
 *   drivingHoursFrom55449,
 *   seasonalWaterSuspended?: boolean, seasonalShowersSuspended?: boolean, travelMonth?: number
 * }
 *
 * Implements the traveler's strict "8 mandatory requirements" rule (spec section 12):
 * any UNKNOWN or NO on a mandatory requirement blocks QUALIFIED status.
 */
function evaluateCampsiteQualification(campsite) {
  const failures = [];
  const unresolved = [];

  if (!QUALIFYING_WATERFRONT_STATUSES.includes(campsite.waterfrontStatus)) {
    if (campsite.waterfrontStatus === WATERFRONT_STATUS.UNKNOWN) unresolved.push('waterfrontStatus');
    else failures.push(`waterfrontStatus is "${campsite.waterfrontStatus}" — requires DIRECT_WATERFRONT or LAKE_VIEW at the individual-site level, not campground-level LAKE_ACCESS`);
  }

  if (campsite.waterHookup !== HOOKUP.YES) {
    (campsite.waterHookup === HOOKUP.UNKNOWN ? unresolved : failures).push('individual site water hookup');
  }

  if (campsite.electricHookup !== HOOKUP.YES) {
    (campsite.electricHookup === HOOKUP.UNKNOWN ? unresolved : failures).push('individual site electric hookup');
  }

  const bath = campsite.bathhouse || {};
  for (const [field, label] of [['flushToilets', 'bathhouse flush toilets'], ['hotColdWater', 'bathhouse hot/cold water'], ['hotShowers', 'bathhouse hot showers']]) {
    if (bath[field] !== HOOKUP.YES) {
      (bath[field] === HOOKUP.UNKNOWN ? unresolved : failures).push(label);
    }
  }

  if (typeof campsite.drivingHoursFrom55449 !== 'number') {
    unresolved.push('drivingHoursFrom55449');
  }

  // Seasonal operation check (spec section 17) — outside Jun-Aug, hookups/showers may be suspended
  // even if generally advertised as present.
  if (campsite.seasonalWaterSuspended) failures.push('water service suspended for the travel month');
  if (campsite.seasonalShowersSuspended) failures.push('shower/bathhouse service suspended for the travel month');

  let verdict;
  if (failures.length > 0) verdict = QUALIFICATION_VERDICT.CONDITIONAL_FAILED;
  else if (unresolved.length > 0) verdict = QUALIFICATION_VERDICT.INSUFFICIENT_EVIDENCE;
  else verdict = QUALIFICATION_VERDICT.QUALIFIED;

  return {
    verdict,
    failedRequirements: failures,
    unresolvedRequirements: unresolved,
    drivingTier: typeof campsite.drivingHoursFrom55449 === 'number' ? classifyDrivingTier(campsite.drivingHoursFrom55449) : null,
  };
}

/**
 * costs: { reservationFee, taxes, vehicleFee, parkEntryFee, mandatoryUtilityFee, nights,
 *          estimatedMpg, roundTripMiles, fuelPricePerGallon, requiredEquipmentCost }
 * All fuel inputs are estimates and must be labeled as such by the caller (see spec section 19).
 */
function calculateCampingTotalCost(costs) {
  const {
    reservationFee = 0,
    taxes = 0,
    vehicleFee = 0,
    parkEntryFee = 0,
    mandatoryUtilityFee = 0,
    estimatedMpg,
    roundTripMiles,
    fuelPricePerGallon,
    requiredEquipmentCost = 0,
  } = costs;

  const siteCost = reservationFee + taxes + vehicleFee + parkEntryFee + mandatoryUtilityFee;

  let estimatedFuelCost = null;
  if (estimatedMpg && roundTripMiles && fuelPricePerGallon) {
    estimatedFuelCost = Math.round((roundTripMiles / estimatedMpg) * fuelPricePerGallon * 100) / 100;
  }

  const total = siteCost + requiredEquipmentCost + (estimatedFuelCost || 0);

  return {
    siteCost: Math.round(siteCost * 100) / 100,
    estimatedFuelCost,
    estimatedFuelCostLabel: estimatedFuelCost !== null ? 'ESTIMATED — based on stated MPG and recent fuel price, not a guaranteed cost' : null,
    requiredEquipmentCost,
    totalEstimatedCost: Math.round(total * 100) / 100,
  };
}

module.exports = {
  WATERFRONT_STATUS,
  QUALIFYING_WATERFRONT_STATUSES,
  HOOKUP,
  AMPERAGE,
  EVIDENCE_CONFIDENCE,
  QUALIFICATION_VERDICT,
  REGIONAL_TIER,
  DEFAULT_CAMPING_SEASON,
  classifyDrivingTier,
  evaluateCampsiteQualification,
  calculateCampingTotalCost,
};
