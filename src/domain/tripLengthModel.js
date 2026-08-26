/**
 * Trip-length flexibility classification (spec: "TRIP LENGTH STRETCH"). Mirrors the
 * budget/travel-time tier pattern: preferred -> stretch range -> hard max -> excluded.
 */

const TRIP_LENGTH_STATUS = Object.freeze({
  PREFERRED: 'PREFERRED',
  STRETCH: 'STRETCH',
  MAX: 'MAX',
  EXCLUDED: 'EXCLUDED',
  UNVERIFIED: 'UNVERIFIED',
});

const TRIP_LENGTH_LABEL = Object.freeze({
  [TRIP_LENGTH_STATUS.PREFERRED]: 'Preferred length',
  [TRIP_LENGTH_STATUS.STRETCH]: 'Stretch length',
  [TRIP_LENGTH_STATUS.MAX]: 'Maximum length',
  [TRIP_LENGTH_STATUS.EXCLUDED]: 'Excluded — exceeds maximum trip length',
  [TRIP_LENGTH_STATUS.UNVERIFIED]: 'Unverified',
});

/**
 * nights: number | null/undefined
 * tripLength: profile.tripLength shape — { preferred, stretch: {min,max}, max }
 */
function classifyTripLength(nights, tripLength) {
  if (typeof nights !== 'number' || Number.isNaN(nights)) {
    return { status: TRIP_LENGTH_STATUS.UNVERIFIED, label: TRIP_LENGTH_LABEL[TRIP_LENGTH_STATUS.UNVERIFIED], nights: null };
  }

  const { preferred, stretch, max } = tripLength;

  if (nights > max) {
    return { status: TRIP_LENGTH_STATUS.EXCLUDED, label: TRIP_LENGTH_LABEL[TRIP_LENGTH_STATUS.EXCLUDED], nights };
  }
  if (nights === preferred) {
    return { status: TRIP_LENGTH_STATUS.PREFERRED, label: TRIP_LENGTH_LABEL[TRIP_LENGTH_STATUS.PREFERRED], nights };
  }
  if (nights >= stretch.min && nights <= stretch.max) {
    return { status: TRIP_LENGTH_STATUS.STRETCH, label: TRIP_LENGTH_LABEL[TRIP_LENGTH_STATUS.STRETCH], nights };
  }
  return { status: TRIP_LENGTH_STATUS.MAX, label: TRIP_LENGTH_LABEL[TRIP_LENGTH_STATUS.MAX], nights };
}

module.exports = { TRIP_LENGTH_STATUS, TRIP_LENGTH_LABEL, classifyTripLength };
