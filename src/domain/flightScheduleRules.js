/**
 * Flight schedule validation against the traveler's profile (spec: "FLIGHT SCHEDULE RULES").
 * Pure functions — no adapter/network dependency, so these are fully testable without live
 * credentials and reusable regardless of which flight provider eventually supplies the data.
 *
 * Timezone note: a mapped flight leg's `localTime` (see mapFlightOffer.js) is already the local
 * clock time at that specific airport, exactly as the provider reports it — these functions never
 * convert or compare across airports' timezones, only against the traveler's own stated
 * HH:MM local-time preferences for the airport actually named in the rule (MSP for both outbound
 * departure and return arrival, per the profile).
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayNameFromIsoDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// localTime: 'YYYY-MM-DDTHH:MM:SS' (or with seconds omitted) as reported by the provider for that
// airport's own local clock.
function timeOfDayMinutes(localTime) {
  const match = /T(\d{2}):(\d{2})/.exec(localTime || '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Outbound rule: depart on profile.flight.outboundDay, from MSP, after outboundDepartAfter.
 */
function matchesOutboundRule(leg, profile) {
  const reasons = [];
  const departDate = (leg.departure.localTime || '').slice(0, 10);
  const actualDay = departDate ? dayNameFromIsoDate(departDate) : null;
  if (actualDay !== profile.flight.outboundDay) {
    reasons.push(`departs ${actualDay || 'an unknown day'}, not ${profile.flight.outboundDay}`);
  }
  if (leg.departure.airportCode !== profile.airport) {
    reasons.push(`departs from ${leg.departure.airportCode}, not ${profile.airport}`);
  }
  const departMinutes = timeOfDayMinutes(leg.departure.localTime);
  const thresholdMinutes = hhmmToMinutes(profile.flight.outboundDepartAfter);
  if (departMinutes == null || departMinutes < thresholdMinutes) {
    reasons.push(`departs before ${profile.flight.outboundDepartAfter} local`);
  }
  return { matches: reasons.length === 0, reasons };
}

/**
 * Return rule: return on profile.flight.returnDay, arriving at MSP within the configured window,
 * with a proximity score toward the target arrival time (spec's worked example: 4:55/5:10 PM
 * against a 5:00 PM target = excellent; 3:15 PM = lower preference but valid within a wider
 * window; 6:30 PM = outside the preferred window unless stretch is allowed).
 */
function matchesReturnRule(leg, profile) {
  const reasons = [];
  const arriveDate = (leg.arrival.localTime || '').slice(0, 10);
  const actualDay = arriveDate ? dayNameFromIsoDate(arriveDate) : null;
  if (actualDay !== profile.flight.returnDay) {
    reasons.push(`arrives ${actualDay || 'an unknown day'}, not ${profile.flight.returnDay}`);
  }
  if (leg.arrival.airportCode !== profile.airport) {
    reasons.push(`arrives at ${leg.arrival.airportCode}, not ${profile.airport}`);
  }

  const arriveMinutes = timeOfDayMinutes(leg.arrival.localTime);
  const windowStart = hhmmToMinutes(profile.flight.returnArrivalWindow.start);
  const windowEnd = hhmmToMinutes(profile.flight.returnArrivalWindow.end);
  const withinWindow = arriveMinutes != null && arriveMinutes >= windowStart && arriveMinutes <= windowEnd;
  if (!withinWindow) {
    reasons.push(`arrives outside the ${profile.flight.returnArrivalWindow.start}–${profile.flight.returnArrivalWindow.end} preferred window`);
  }

  let proximityScore = 0;
  if (arriveMinutes != null) {
    const targetMinutes = hhmmToMinutes(profile.flight.returnArrivalTarget);
    const deltaMinutes = Math.abs(arriveMinutes - targetMinutes);
    // 0 minutes off -> 100; 60+ minutes off -> 0. Linear in between — a documented judgment call,
    // not a spec-given curve.
    proximityScore = Math.max(0, Math.round(100 - (deltaMinutes / 60) * 100));
  }

  return { matches: reasons.length === 0 && withinWindow, reasons, proximityScore };
}

/**
 * Nonstop / max-connections preference. profile.flight.maxConnections is stated as "when
 * materially better" — this only flags a violation for hard reporting; ranking nuance (is a
 * connection "materially better" via price) is left to the caller, since that requires comparing
 * against other real offers, not a fact this function alone can judge.
 */
function matchesConnectionPreference(flight, profile) {
  const stops = flight.segments.length - 1;
  const reasons = [];
  if (profile.flight.preferredType === 'nonstop' && stops > 0) {
    reasons.push(`${stops} connection${stops === 1 ? '' : 's'}, traveler prefers nonstop`);
  }
  if (stops > profile.flight.maxConnections) {
    reasons.push(`${stops} connections exceeds the configured max of ${profile.flight.maxConnections}`);
  }
  return { matches: reasons.length === 0, stops, reasons };
}

module.exports = {
  dayNameFromIsoDate,
  hhmmToMinutes,
  timeOfDayMinutes,
  matchesOutboundRule,
  matchesReturnRule,
  matchesConnectionPreference,
};
