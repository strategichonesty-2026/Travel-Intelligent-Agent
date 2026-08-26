/**
 * Applies the profile's default flight-schedule pattern (e.g. "Thursday -> Sunday, 3 nights") to
 * produce a concrete next-occurrence date range. Used to default the deal board's Dates/Duration
 * columns when the traveler hasn't picked an explicit date in the Discover form.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseIsoDateUtc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * referenceIso: 'YYYY-MM-DD', defaults to today.
 * Returns the next date on/after the reference whose weekday matches `dayName`.
 */
function nextOccurrenceOf(dayName, referenceIso) {
  const targetDow = DAY_NAMES.indexOf(dayName);
  if (targetDow === -1) throw new Error(`Unknown day name: ${dayName}`);
  const ref = parseIsoDateUtc(referenceIso);
  const diff = (targetDow - ref.getUTCDay() + 7) % 7;
  const result = new Date(ref);
  result.setUTCDate(result.getUTCDate() + diff);
  return result;
}

/**
 * Computes the next trip window using profile.flight.outboundDay / profile.tripLength.preferred
 * nights. Returns { startDate, endDate, nights } as ISO date strings / number.
 */
function computeDefaultTripDates(profile, referenceIso = toIsoDate(new Date())) {
  const nights = profile.tripLength.preferred;
  const start = nextOccurrenceOf(profile.flight.outboundDay, referenceIso);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + nights);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end), nights };
}

module.exports = { computeDefaultTripDates, nextOccurrenceOf, DAY_NAMES };
