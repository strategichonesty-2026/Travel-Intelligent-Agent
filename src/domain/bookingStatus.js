const BOOKING_STATUS = Object.freeze({
  RESEARCH_ONLY: 'RESEARCH_ONLY',
  CHECK_AVAILABILITY: 'CHECK_AVAILABILITY',
  BOOKING_READY: 'BOOKING_READY',
  MONITOR: 'MONITOR',
  BOOKED: 'BOOKED',
  EXPIRED: 'EXPIRED',
});

const LINK_TYPE = Object.freeze({
  OFFICIAL_BOOKING: 'OFFICIAL_BOOKING', // direct link to airline/hotel/campground/state-park/NPS/Recreation.gov/cruise/attraction/rental-car provider
  AUTHORIZED_BOOKING_PROVIDER: 'AUTHORIZED_BOOKING_PROVIDER', // legitimate third-party booking provider
  INFORMATIONAL_SOURCE: 'INFORMATIONAL_SOURCE', // provides info but no booking action — never labeled as a booking link
});

const BUTTON_LABEL = Object.freeze({
  BOOK_NOW: 'Book Now',
  CHECK_AVAILABILITY: 'Check Availability',
});

/**
 * Section 15: a booking link must pass every check before it can be surfaced as bookable.
 * Each field is a boolean the caller has actually verified — never assumed true by default.
 */
function validateBookingLink({ urlExists, belongsToAuthorizedProvider, matchesProperty, notObviouslyExpired, isAccessible, reservationMechanismIdentifiable }) {
  const checks = { urlExists, belongsToAuthorizedProvider, matchesProperty, notObviouslyExpired, isAccessible, reservationMechanismIdentifiable };
  const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return { valid: failedChecks.length === 0, failedChecks };
}

/**
 * Determines the booking button label. Section 5: "Book Now" only when current inventory has
 * been verified; otherwise "Check Availability".
 */
function determineButtonLabel({ availabilityVerified }) {
  return availabilityVerified ? BUTTON_LABEL.BOOK_NOW : BUTTON_LABEL.CHECK_AVAILABILITY;
}

/**
 * Section 6/26: BOOKING_READY requires every one of these to be true. Missing or unverified
 * inputs fall back to CHECK_AVAILABILITY (link exists but not fully verified) or RESEARCH_ONLY
 * (no actionable link at all) rather than being assumed passing.
 */
function determineBookingStatus(input) {
  const {
    mandatoryConstraintsPassed,
    currentPriceVerified,
    currentAvailabilityVerified, // null/undefined allowed when availability isn't trackable for this provider
    bookingSourceIdentified,
    mandatoryFeesIdentified,
    criticalAmenitiesVerified,
    cancellationPolicyIdentified, // null/undefined allowed "where available" per spec
    bookingLinkValidation, // result of validateBookingLink(), or null if no link at all
    alreadyBooked,
    expired,
    monitoring,
  } = input;

  if (expired) return BOOKING_STATUS.EXPIRED;
  if (alreadyBooked) return BOOKING_STATUS.BOOKED;
  if (monitoring) return BOOKING_STATUS.MONITOR;

  const hasValidLink = Boolean(bookingLinkValidation && bookingLinkValidation.valid);
  if (!hasValidLink || !bookingSourceIdentified) {
    return BOOKING_STATUS.RESEARCH_ONLY;
  }

  const readyChecks = [
    mandatoryConstraintsPassed,
    currentPriceVerified,
    currentAvailabilityVerified !== false, // false = actively unavailable; null/undefined/true are acceptable
    bookingSourceIdentified,
    mandatoryFeesIdentified,
    criticalAmenitiesVerified,
    cancellationPolicyIdentified !== false, // only fails if explicitly checked-and-missing where it should exist
  ];

  const allReady = readyChecks.every(Boolean);
  return allReady ? BOOKING_STATUS.BOOKING_READY : BOOKING_STATUS.CHECK_AVAILABILITY;
}

/**
 * Section 7: never present a research-time price as guaranteed.
 */
function formatPriceDisclaimer(verifiedAtIso) {
  const ts = new Date(verifiedAtIso).toISOString();
  return `Price verified at ${ts}. Final price is confirmed by the booking provider at checkout.`;
}

module.exports = {
  BOOKING_STATUS,
  LINK_TYPE,
  BUTTON_LABEL,
  validateBookingLink,
  determineButtonLabel,
  determineBookingStatus,
  formatPriceDisclaimer,
};
