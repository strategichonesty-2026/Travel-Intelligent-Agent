const { matchesOutboundRule, matchesReturnRule, matchesConnectionPreference } = require('./flightScheduleRules');

/**
 * Evaluates one mapped FlightOption (see mapFlightOffer.js) against the traveler's schedule
 * rules. Expects a round-trip offer (itineraries[0] = outbound, itineraries[1] = return) — an
 * offer missing either leg is skipped (null) rather than guessed at.
 */
function evaluateOffer(offer, profile) {
  const outbound = offer.itineraries?.[0];
  const inbound = offer.itineraries?.[1];
  if (!outbound?.segments?.length || !inbound?.segments?.length) return null;

  const outboundFit = matchesOutboundRule({ departure: outbound.segments[0].departure }, profile);
  const returnFit = matchesReturnRule({ arrival: inbound.segments[inbound.segments.length - 1].arrival }, profile);
  const outboundConn = matchesConnectionPreference(outbound, profile);
  const inboundConn = matchesConnectionPreference(inbound, profile);

  return {
    offer,
    outbound,
    inbound,
    outboundFit,
    returnFit,
    outboundConn,
    inboundConn,
    totalStops: outbound.stops + inbound.stops,
    scheduleMatches: outboundFit.matches && returnFit.matches,
    // Spec's "travel time" thresholds (preferred/stretch/max hours) read as one-way transit time,
    // matching how camping's drivingHoursFrom55449 is also one-way — the outbound leg's duration.
    oneWayTravelHours: outbound.durationHours,
  };
}

/**
 * Picks the single best offer for this traveler: schedule-rule matches first, then fewer total
 * stops (nonstop preference), then closer return-arrival proximity to the target time, then lower
 * price. Returns null if nothing in `offers` is a usable round-trip offer.
 */
function selectBestFlight(offers, profile) {
  const evaluated = (offers || []).map((o) => evaluateOffer(o, profile)).filter(Boolean);
  if (evaluated.length === 0) return null;

  evaluated.sort((a, b) => {
    if (a.scheduleMatches !== b.scheduleMatches) return a.scheduleMatches ? -1 : 1;
    if (a.totalStops !== b.totalStops) return a.totalStops - b.totalStops;
    if (a.returnFit.proximityScore !== b.returnFit.proximityScore) return b.returnFit.proximityScore - a.returnFit.proximityScore;
    const priceA = a.offer.totalPrice ?? Infinity;
    const priceB = b.offer.totalPrice ?? Infinity;
    return priceA - priceB;
  });

  return evaluated[0];
}

module.exports = { evaluateOffer, selectBestFlight };
