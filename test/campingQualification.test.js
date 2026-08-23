const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  WATERFRONT_STATUS,
  HOOKUP,
  QUALIFICATION_VERDICT,
  evaluateCampsiteQualification,
  calculateCampingTotalCost,
  classifyDrivingTier,
} = require('../src/domain/campingQualification');

const fullyQualifiedSite = {
  waterfrontStatus: WATERFRONT_STATUS.DIRECT_WATERFRONT,
  waterHookup: HOOKUP.YES,
  electricHookup: HOOKUP.YES,
  bathhouse: { flushToilets: HOOKUP.YES, hotColdWater: HOOKUP.YES, hotShowers: HOOKUP.YES },
  drivingHoursFrom55449: 3.5,
};

test('a site meeting every mandatory requirement is QUALIFIED', () => {
  const result = evaluateCampsiteQualification(fullyQualifiedSite);
  assert.equal(result.verdict, QUALIFICATION_VERDICT.QUALIFIED);
  assert.equal(result.failedRequirements.length, 0);
  assert.equal(result.unresolvedRequirements.length, 0);
});

test('LAKE_ACCESS at the campground level does not satisfy waterfront requirement', () => {
  const site = { ...fullyQualifiedSite, waterfrontStatus: WATERFRONT_STATUS.LAKE_ACCESS };
  const result = evaluateCampsiteQualification(site);
  assert.equal(result.verdict, QUALIFICATION_VERDICT.CONDITIONAL_FAILED);
  assert.ok(result.failedRequirements.some((f) => f.includes('waterfrontStatus')));
});

test('LAKE_VIEW satisfies the waterfront requirement', () => {
  const site = { ...fullyQualifiedSite, waterfrontStatus: WATERFRONT_STATUS.LAKE_VIEW };
  const result = evaluateCampsiteQualification(site);
  assert.equal(result.verdict, QUALIFICATION_VERDICT.QUALIFIED);
});

test('unknown water hookup produces INSUFFICIENT_EVIDENCE, not a hard failure', () => {
  const site = { ...fullyQualifiedSite, waterHookup: HOOKUP.UNKNOWN };
  const result = evaluateCampsiteQualification(site);
  assert.equal(result.verdict, QUALIFICATION_VERDICT.INSUFFICIENT_EVIDENCE);
});

test('vault toilets (bathhouse flushToilets = NO) hard-fails qualification (Highland Ridge case)', () => {
  const site = { ...fullyQualifiedSite, bathhouse: { flushToilets: HOOKUP.NO, hotColdWater: HOOKUP.YES, hotShowers: HOOKUP.YES } };
  const result = evaluateCampsiteQualification(site);
  assert.equal(result.verdict, QUALIFICATION_VERDICT.CONDITIONAL_FAILED);
});

test('seasonal water suspension fails qualification even if hookup otherwise exists', () => {
  const site = { ...fullyQualifiedSite, seasonalWaterSuspended: true };
  const result = evaluateCampsiteQualification(site);
  assert.equal(result.verdict, QUALIFICATION_VERDICT.CONDITIONAL_FAILED);
});

test('driving tier classification matches spec radius bands', () => {
  assert.equal(classifyDrivingTier(2), 'TIER_1');
  assert.equal(classifyDrivingTier(3.5), 'TIER_2');
  assert.equal(classifyDrivingTier(4.5), 'TIER_3');
  assert.equal(classifyDrivingTier(7), 'BEYOND_PREFERRED_RADIUS');
});

test('calculateCampingTotalCost sums fees and labels fuel as estimated', () => {
  const result = calculateCampingTotalCost({
    reservationFee: 60, taxes: 5, vehicleFee: 8, parkEntryFee: 0, mandatoryUtilityFee: 0,
    estimatedMpg: 25, roundTripMiles: 200, fuelPricePerGallon: 3.2,
  });
  assert.equal(result.siteCost, 73);
  assert.equal(result.estimatedFuelCost, 25.6);
  assert.match(result.estimatedFuelCostLabel, /ESTIMATED/);
  assert.equal(result.totalEstimatedCost, 98.6);
});
