/**
 * Personal Travel Profile defaults (Phase 1). Every value here is meant to be edited by the
 * traveler — see src/services/profileService.js for the persisted-override layer. Numbers not
 * explicitly given in the spec (vehicle MPG, fuel price, food budget) are reasonable starting
 * defaults clearly labeled ESTIMATED wherever they feed a cost calculation, never presented as
 * verified.
 */

const DEFAULT_PROFILE = {
  travelers: 2,
  homeZip: '55449',
  airport: 'MSP',
  roomCount: 1,
  preferredBed: 'king_or_queen',
  preferredTripType: 'best_overall_value',
  rentalCar: 'only_when_useful',
  primaryGoal: 'best_deal_and_value',
  foodBudgetPerPersonPerDay: 60,

  flight: {
    preferredType: 'nonstop',
    maxConnections: 1,
    outboundDay: 'Thursday',
    outboundDepartAfter: '15:00',
    returnDay: 'Sunday',
    returnArrivalTarget: '17:00',
    returnArrivalWindow: { start: '16:00', end: '18:00' },
  },

  tripLength: {
    preferred: 3,
    stretch: { min: 2, max: 4 },
    max: 5,
  },

  budget: {
    preferred: { min: 1000, max: 2000 },
    stretch: { enabled: true, max: 3500 },
    absoluteMax: 5000,
  },

  travelTime: {
    preferred: 5,
    stretch: { enabled: true, max: 8 },
    absoluteMax: 12,
  },

  // Feeds the ESTIMATED fuel-cost line in camping total-cost calculations — never a verified fee.
  vehicle: {
    mpg: 22,
    fuelPricePerGallon: 3.5,
  },

  // Learned/edited camping style — spec's initial list is examples that teach this profile, not a
  // hard allowlist (see src/domain/campingQualification.js for the strict per-site validation this
  // feeds into).
  campingPreferences: {
    waterfront: 'strongly_preferred',
    lakeView: 'strongly_preferred',
    riverfront: 'acceptable',
    individualWaterHookup: 'strongly_preferred',
    individualElectricHookup: 'strongly_preferred',
    cleanFacilities: 'required',
    flushToilets: 'required',
    hotShowers: 'required',
    hotColdRunningWater: 'required',
    largerSites: 'preferred',
    rvSuitability: 'when_applicable',
    resortAmenities: 'plus',
    beachAccess: 'plus',
    boatAccess: 'plus',
    goodValue: 'preferred',
  },
};

module.exports = { DEFAULT_PROFILE };
