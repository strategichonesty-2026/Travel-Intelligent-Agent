/**
 * Travel-time classification (spec: "TRAVEL TIME MODEL" / "TRAVEL TIME STRETCH RULE"). Matches
 * the spec's own worked example exactly: preferred=5h, stretch=8h, max=12h ->
 *   6h  => STRETCH_TRAVEL_TIME
 *   10h => LONG_TRAVEL_TIME
 *   13h => EXCLUDED
 */

const TRAVEL_TIME_STATUS = Object.freeze({
  PREFERRED: 'PREFERRED',
  STRETCH_TRAVEL_TIME: 'STRETCH_TRAVEL_TIME',
  LONG_TRAVEL_TIME: 'LONG_TRAVEL_TIME',
  EXCLUDED: 'EXCLUDED',
  UNVERIFIED: 'UNVERIFIED',
});

const TRAVEL_TIME_LABEL = Object.freeze({
  [TRAVEL_TIME_STATUS.PREFERRED]: 'Preferred travel time',
  [TRAVEL_TIME_STATUS.STRETCH_TRAVEL_TIME]: 'Stretch travel time',
  [TRAVEL_TIME_STATUS.LONG_TRAVEL_TIME]: 'Long travel time',
  [TRAVEL_TIME_STATUS.EXCLUDED]: 'Excluded — exceeds maximum travel time',
  [TRAVEL_TIME_STATUS.UNVERIFIED]: 'Unverified',
});

/**
 * hours: number | null/undefined (null when travel time isn't known yet, e.g. no flight data —
 * returns UNVERIFIED rather than guessing).
 * travelTime: profile.travelTime shape — { preferred, stretch: {enabled, max}, absoluteMax }
 */
function classifyTravelTime(hours, travelTime) {
  if (typeof hours !== 'number' || Number.isNaN(hours)) {
    return { status: TRAVEL_TIME_STATUS.UNVERIFIED, label: TRAVEL_TIME_LABEL[TRAVEL_TIME_STATUS.UNVERIFIED], hours: null };
  }

  const { preferred, stretch, absoluteMax } = travelTime;

  if (hours > absoluteMax) {
    return { status: TRAVEL_TIME_STATUS.EXCLUDED, label: TRAVEL_TIME_LABEL[TRAVEL_TIME_STATUS.EXCLUDED], hours };
  }
  if (hours <= preferred) {
    return { status: TRAVEL_TIME_STATUS.PREFERRED, label: TRAVEL_TIME_LABEL[TRAVEL_TIME_STATUS.PREFERRED], hours };
  }
  if (stretch.enabled && hours <= stretch.max) {
    return { status: TRAVEL_TIME_STATUS.STRETCH_TRAVEL_TIME, label: TRAVEL_TIME_LABEL[TRAVEL_TIME_STATUS.STRETCH_TRAVEL_TIME], hours };
  }
  return { status: TRAVEL_TIME_STATUS.LONG_TRAVEL_TIME, label: TRAVEL_TIME_LABEL[TRAVEL_TIME_STATUS.LONG_TRAVEL_TIME], hours };
}

module.exports = { TRAVEL_TIME_STATUS, TRAVEL_TIME_LABEL, classifyTravelTime };
