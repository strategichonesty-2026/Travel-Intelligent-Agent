const campgroundService = require('./campgroundService');
const { discoverDestinations } = require('../domain/destinationDiscovery');
const { calculateCampingTotalCost } = require('../domain/campingQualification');
const { classifyBudget } = require('../domain/budgetModel');
const { classifyTravelTime } = require('../domain/travelTimeModel');
const { computeDefaultTripDates } = require('../domain/tripDates');
const { CANDIDATE_STATUS, CANDIDATE_STATUS_RANK, deriveCandidateStatus } = require('../domain/candidateStatus');
const flightsAdapter = require('../adapters/flights/flightsAdapter');
const { selectBestFlight } = require('../domain/flightSelection');

const AVG_DRIVING_SPEED_MPH = 55;
const WARM_CATEGORIES = ['mexico', 'socal', 'florida', 'southwest'];
// Caps how many destinations get a live flight search per table render — a free/test-tier
// provider and page-load time both argue against searching all 20+ catalog candidates on every
// request. The rest keep the honest "no flight data yet" placeholder rather than a live lookup.
const FLIGHT_LOOKUP_LIMIT = 8;

/**
 * The personal travel deal desk (Phase 1) / deal-first discovery engine (Phase 2) — merges the
 * real, site-level-researched campground data with the curated (not yet independently researched)
 * destination catalog into one ranked, status-tiered table.
 *
 * Camping rows get a real computed total cost (nightly rate x nights + an ESTIMATED fuel line) —
 * the campground data is genuinely researched. General destination rows have NO live flight/hotel
 * adapter configured yet (that's Phase 3/4), so their cost/budget/travel-time columns are
 * deliberately UNVERIFIED rather than fabricated, per the non-negotiable data rule — which is also
 * why they can only ever reach candidateStatus UNVERIFIED today, never RECOMMENDED/STRETCH/
 * EXCLUDED (those require real budget/travel-time facts this codebase doesn't have for them yet).
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
  const hasRealTravelTime = typeof c.drivingHoursFrom55449 === 'number';
  const travelTimeStatus = classifyTravelTime(hasRealTravelTime ? c.drivingHoursFrom55449 : null, profile.travelTime);
  const qualificationVerdict = c.qualification?.verdict || null;
  const candidateStatus = deriveCandidateStatus({
    budgetStatus: budgetStatus.status,
    travelTimeStatus: travelTimeStatus.status,
    qualificationVerdict,
    hasRealCost: cost.amount != null,
    hasRealTravelTime,
  });
  // Reuses the same live link-validation path as the Camping tab's cards — no separate,
  // cheaper-but-less-honest status computed just for the table view.
  const booking = await campgroundService.buildBookingInfo(c);

  return {
    id: c.id,
    destination: c.resolvedName,
    tripType: 'CAMPING',
    dates,
    duration: `${nights} night${nights === 1 ? '' : 's'}`,
    flightSummary: hasRealTravelTime ? `Drive ~${c.drivingHoursFrom55449}h from 55449` : 'Drive time unknown',
    lodging: c.resolvedName,
    totalCost: cost,
    budgetStatus,
    travelTimeStatus,
    candidateStatus,
    valueScore: typeof c.valueScore === 'number' ? Math.round(c.valueScore) : null,
    evidenceStatus: c.verification?.confidence || 'LOW',
    qualificationVerdict,
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

function formatLocalTime(isoLocalTime, airportCode) {
  const match = /T(\d{2}):(\d{2})/.exec(isoLocalTime || '');
  if (!match) return 'unknown time';
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}${airportCode ? ` ${airportCode}` : ''}`;
}

function describeBestFlight(best) {
  const outboundSeg = best.outbound.segments[0];
  const inboundSeg = best.inbound.segments[best.inbound.segments.length - 1];
  const label = best.totalStops === 0 ? 'nonstop' : `${best.totalStops} stop${best.totalStops === 1 ? '' : 's'}`;
  const airline = outboundSeg.airlineName || outboundSeg.carrierCode || 'Unknown airline';
  return `${airline} ${outboundSeg.flightNumber || ''} ${label} · depart ${formatLocalTime(outboundSeg.departure.localTime, outboundSeg.departure.airportCode)} · return arrive ${formatLocalTime(inboundSeg.arrival.localTime, inboundSeg.arrival.airportCode)}`.replace(/\s+/g, ' ').trim();
}

/**
 * Looks up a real flight (when Duffel is configured and this destination has an airportCode) and
 * folds it into the row. Trip-level totalCost/budgetStatus stay UNVERIFIED even with a real flight
 * price, because lodging isn't priced yet (Phase 4/5) — showing "budget: within preferred" off a
 * flight-only price would misrepresent the whole trip's cost. travelTimeStatus, by contrast, CAN
 * become real here: flight duration is a complete, real fact on its own.
 */
async function toGeneralRow(d, { nights, dates, profile, departDate, returnDate, allowFlightLookup }) {
  let flightSummary = 'Unverified — no flight data yet';
  let travelTimeStatus = { status: 'UNVERIFIED', label: 'Unverified — no flight data yet', hours: null };
  let flightPrice = { amount: null, label: 'UNVERIFIED' };
  let flightSource = null;
  let flightCheckedAt = null;

  if (d.airportCode && allowFlightLookup && flightsAdapter.isConfigured()) {
    const search = await flightsAdapter.searchFlights({
      origin: profile.airport,
      destination: d.airportCode,
      departDate,
      returnDate,
      travelers: profile.travelers,
      maxConnections: profile.flight.maxConnections,
    });
    flightSource = search.source;
    flightCheckedAt = search.checkedAt;

    if (search.error) {
      flightSummary = `Unverified — flight search failed: ${search.error}`;
    } else if (search.results.length === 0) {
      flightSummary = 'Unverified — no matching flights found';
    } else {
      const best = selectBestFlight(search.results, profile);
      if (best) {
        flightSummary = describeBestFlight(best);
        travelTimeStatus = classifyTravelTime(best.oneWayTravelHours, profile.travelTime);
        flightPrice = { amount: best.offer.totalPrice, label: best.offer.totalPrice != null ? 'VERIFIED' : 'UNVERIFIED' };
      }
    }
  } else if (!d.airportCode) {
    flightSummary = 'Unverified — no single airport for this region';
  } else if (!flightsAdapter.isConfigured()) {
    flightSummary = 'Unverified — no flight data yet';
  } else {
    flightSummary = 'Unverified — flight lookup skipped for this page (see top candidates only)';
  }

  // Trip-level cost/budget intentionally stay UNVERIFIED — see function comment.
  const candidateStatus = deriveCandidateStatus({
    budgetStatus: 'UNVERIFIED',
    travelTimeStatus: travelTimeStatus.status,
    qualificationVerdict: null,
    hasRealCost: false,
    hasRealTravelTime: travelTimeStatus.status !== 'UNVERIFIED',
  });

  return {
    id: d.destinationId,
    destination: d.name,
    tripType: TRIP_TYPE_BY_CATEGORY[d.category] || 'OUTDOOR',
    dates,
    duration: `${nights} night${nights === 1 ? '' : 's'}`,
    flightSummary,
    flightPrice,
    flightSource,
    flightCheckedAt,
    lodging: 'Unverified — no lodging data yet',
    totalCost: { amount: null, label: 'UNVERIFIED' },
    budgetStatus: { status: 'UNVERIFIED', label: 'Unverified — no pricing yet' },
    travelTimeStatus,
    candidateStatus,
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

  if (sort === 'cost') {
    return [...rows].sort((a, b) => compareNullsLast(a.totalCost.amount, b.totalCost.amount));
  }
  if (sort === 'travelTime') {
    return [...rows].sort((a, b) => compareNullsLast(a.travelTimeStatus.hours, b.travelTimeStatus.hours));
  }

  // Default 'value' sort: budget/travel-time now genuinely drive ranking, not just a display
  // label — candidateStatus tier always leads (Recommended, then Stretch, then Validated, then
  // Candidate/Unverified), with valueScore only breaking ties within the same tier. The tier
  // order itself doesn't flip with `dir` (a "worst deals first" view isn't a real use case); dir
  // only controls the value-score tiebreak direction within each tier.
  return [...rows].sort((a, b) => {
    const rankDiff = CANDIDATE_STATUS_RANK[a.candidateStatus] - CANDIDATE_STATUS_RANK[b.candidateStatus];
    if (rankDiff !== 0) return rankDiff;
    return compareNullsLast(a.valueScore, b.valueScore);
  });
}

/**
 * filter: 'all' | 'camping' | 'warm' | 'roadtrip'
 * sort: 'value' | 'cost' | 'travelTime'
 * dir: 'asc' | 'desc'
 * includeExcluded: when false (default), rows whose candidateStatus is EXCLUDED (over absolute
 * budget max, over absolute travel-time max, or a hard-failed campground qualification) are left
 * out of the ranked results entirely — the deal desk shouldn't rank something it has already
 * determined the traveler explicitly ruled out. Pass true to inspect them (e.g. a "show excluded"
 * toggle) instead of losing that information silently.
 */
async function buildDealBoard({ profile, startDate, preferences = [], filter = 'all', sort = 'value', dir = 'desc', includeExcluded = false }) {
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
    const categoryFilter = filter === 'warm' ? WARM_CATEGORIES : undefined;
    const effectivePreferences = filter === 'roadtrip' ? [...preferences, 'road trip'] : preferences;
    const candidates = discoverDestinations(
      { startDate: effectiveStartDate, preferences: effectivePreferences },
      { minScore: 0, limit: 25, categoryFilter },
    ).filter((d) => d.category !== 'camping'); // real camping rows come from campgroundService above
    // Count lookup slots only against candidates that actually have an airport to search — a
    // region entry like "Great Lakes region (general)" never consumes a slot it can't use.
    let flightLookupsUsed = 0;
    const generalRows = await Promise.all(candidates.map((d) => {
      const allowFlightLookup = d.airportCode && flightLookupsUsed < FLIGHT_LOOKUP_LIMIT;
      if (allowFlightLookup) flightLookupsUsed += 1;
      return toGeneralRow(d, {
        nights,
        dates,
        profile,
        departDate: defaultDates.startDate,
        returnDate: defaultDates.endDate,
        allowFlightLookup,
      });
    }));
    rows.push(...generalRows);
  }

  const excludedCount = rows.filter((r) => r.candidateStatus === CANDIDATE_STATUS.EXCLUDED).length;
  if (!includeExcluded) {
    rows = rows.filter((r) => r.candidateStatus !== CANDIDATE_STATUS.EXCLUDED);
  }

  rows = sortRows(rows, sort, dir).map((row, i) => ({ ...row, rank: i + 1 }));
  // Attached rather than returned as {rows, excludedCount} so existing callers that treat the
  // result as a plain array of rows keep working unchanged — arrays can carry extra properties.
  rows.excludedCount = excludedCount;
  return rows;
}

module.exports = { buildDealBoard, campingTotalCost, WARM_CATEGORIES };
