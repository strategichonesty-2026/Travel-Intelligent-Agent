const campgroundService = require('./campgroundService');
const { discoverDestinations } = require('../domain/destinationDiscovery');
const { calculateCampingTotalCost } = require('../domain/campingQualification');
const { classifyBudget } = require('../domain/budgetModel');
const { classifyTravelTime } = require('../domain/travelTimeModel');
const { computeDefaultTripDates } = require('../domain/tripDates');

const AVG_DRIVING_SPEED_MPH = 55;

/**
 * Phase 1 "personal travel deal desk" — merges the real, site-level-researched campground data
 * with the curated (not yet independently researched) destination catalog into one ranked table.
 *
 * Camping rows get a real computed total cost (nightly rate x nights + an ESTIMATED fuel line) —
 * the campground data is genuinely researched. General destination rows have NO live flight/hotel
 * adapter configured yet (that's Phase 3/4), so their cost/budget/travel-time columns are
 * deliberately UNVERIFIED rather than fabricated, per the non-negotiable data rule.
 */

function campingTotalCost(campground, nights, vehicle) {
  const nightlyAmount = campground.nightlyRate?.amount;
  if (nightlyAmount == null) return { amount: null, label: 'UNVERIFIED' };

  const roundTripMiles = typeof campground.drivingHoursFrom55449 === 'number'
    ? campground.drivingHoursFrom55449 * 2 * AVG_DRIVING_SPEED_MPH
    : null;

  const result = calculateCampingTotalCost({
    reservationFee: nightlyAmount * nights,
    estimatedMpg: vehicle.mpg,
    roundTripMiles,
    fuelPricePerGallon: vehicle.fuelPricePerGallon,
  });

  // Taxes/vehicle/park-entry fees aren't tracked per campground record yet, so this total is a
  // floor estimate even though the nightly rate itself is a real researched figure — labeled
  // ESTIMATED rather than VERIFIED for that reason.
  return { amount: result.totalEstimatedCost, label: 'ESTIMATED' };
}

async function toCampingRow(c, { nights, dates, profile }) {
  const cost = campingTotalCost(c, nights, profile.vehicle);
  const budgetStatus = classifyBudget(cost.amount, profile.budget);
  const travelTimeStatus = classifyTravelTime(
    typeof c.drivingHoursFrom55449 === 'number' ? c.drivingHoursFrom55449 : null,
    profile.travelTime,
  );
  // Reuses the same live link-validation path as the Camping tab's cards — no separate,
  // cheaper-but-less-honest status computed just for the table view.
  const booking = await campgroundService.buildBookingInfo(c);

  return {
    id: c.id,
    destination: c.resolvedName,
    tripType: 'CAMPING',
    dates,
    duration: `${nights} night${nights === 1 ? '' : 's'}`,
    flightSummary: typeof c.drivingHoursFrom55449 === 'number' ? `Drive ~${c.drivingHoursFrom55449}h from 55449` : 'Drive time unknown',
    lodging: c.resolvedName,
    totalCost: cost,
    budgetStatus,
    travelTimeStatus,
    valueScore: typeof c.valueScore === 'number' ? Math.round(c.valueScore) : null,
    evidenceStatus: c.verification?.confidence || 'LOW',
    qualificationVerdict: c.qualification?.verdict || null,
    bookingStatus: booking.bookingStatus,
    bookingUrl: booking.bookingUrl,
    detailHref: '/?tab=camping',
    sourceCategory: 'camping',
  };
}

const TRIP_TYPE_BY_CATEGORY = {
  colorado: 'ROAD_TRIP',
  niagara: 'ROAD_TRIP',
  mexico: 'WARM_ESCAPE',
  socal: 'WARM_ESCAPE',
  florida: 'WARM_ESCAPE',
  southwest: 'WARM_ESCAPE',
  cruise: 'CRUISE',
};

function toGeneralRow(d, { nights, dates }) {
  return {
    id: d.destinationId,
    destination: d.name,
    tripType: TRIP_TYPE_BY_CATEGORY[d.category] || 'OUTDOOR',
    dates,
    duration: `${nights} night${nights === 1 ? '' : 's'}`,
    flightSummary: 'Unverified — no flight data yet',
    lodging: 'Unverified — no lodging data yet',
    totalCost: { amount: null, label: 'UNVERIFIED' },
    budgetStatus: { status: 'UNVERIFIED', label: 'Unverified — no pricing yet' },
    travelTimeStatus: { status: 'UNVERIFIED', label: 'Unverified — no flight data yet', hours: null },
    valueScore: d.discoveryScore,
    evidenceStatus: 'LOW',
    qualificationVerdict: null,
    bookingStatus: 'RESEARCH_ONLY',
    bookingUrl: null,
    detailHref: `/?tab=${d.category}`,
    sourceCategory: d.category,
  };
}

function sortRows(rows, sort, dir) {
  const factor = dir === 'asc' ? 1 : -1;
  // Null (unverified) values always sort to the bottom regardless of direction — an unknown cost
  // or travel time should never look "best" just because null happens to compare low.
  const compareNullsLast = (av, bv) => {
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * factor;
  };

  const getters = {
    cost: (r) => r.totalCost.amount,
    travelTime: (r) => r.travelTimeStatus.hours,
    value: (r) => r.valueScore,
  };
  const get = getters[sort] || getters.value;

  return [...rows].sort((a, b) => compareNullsLast(get(a), get(b)));
}

/**
 * filter: 'all' | 'camping' | 'warm' | 'roadtrip'
 * sort: 'value' | 'cost' | 'travelTime'
 * dir: 'asc' | 'desc'
 */
async function buildDealBoard({ profile, startDate, preferences = [], filter = 'all', sort = 'value', dir = 'desc' }) {
  const defaultDates = computeDefaultTripDates(profile, startDate);
  const nights = defaultDates.nights;
  const dates = startDate
    ? `${startDate} → ${defaultDates.endDate}`
    : `${defaultDates.startDate} → ${defaultDates.endDate}`;
  const effectiveStartDate = startDate || defaultDates.startDate;

  let rows = [];

  if (filter === 'all' || filter === 'camping') {
    const qualified = campgroundService.getQualifiedFavorites();
    const ranked = campgroundService.rankFavoritesByValue(qualified);
    const rankedIds = new Set(ranked.map((c) => c.id));
    const rest = campgroundService.listFavorites().filter((c) => !rankedIds.has(c.id));
    const discoveries = campgroundService.listSimilarDiscoveries();
    const campingSource = [...ranked, ...rest, ...discoveries];
    const campingRows = await Promise.all(campingSource.map((c) => toCampingRow(c, { nights, dates, profile })));
    rows.push(...campingRows);
  }

  if (filter !== 'camping') {
    const forcePool = filter === 'warm' ? 'WARM_ESCAPE' : undefined;
    const effectivePreferences = filter === 'roadtrip' ? [...preferences, 'road trip'] : preferences;
    const candidates = discoverDestinations(
      { startDate: effectiveStartDate, preferences: effectivePreferences },
      { minScore: 0, limit: 25, forcePool },
    ).filter((d) => d.category !== 'camping'); // real camping rows come from campgroundService above
    rows.push(...candidates.map((d) => toGeneralRow(d, { nights, dates })));
  }

  rows = sortRows(rows, sort, dir);
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

module.exports = { buildDealBoard, campingTotalCost };
